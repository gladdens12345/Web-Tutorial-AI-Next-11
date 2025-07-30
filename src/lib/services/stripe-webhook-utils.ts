/**
 * Stripe Webhook Utilities
 * 
 * Consolidated utilities for Stripe webhook processing to eliminate duplicate code
 */

import { adminDb } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import Stripe from 'stripe';

export interface StripeUserLookupResult {
  userId: string | null;
  email: string;
  found: boolean;
  source: 'metadata' | 'email_lookup' | 'customer_data' | 'not_found';
}

export interface PremiumUserData {
  userId: string;
  email: string;
  subscriptionStatus: 'premium' | 'limited';
  stripeCustomerId: string;
  stripeSubscriptionId?: string;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  subscriptionPriceId?: string;
  source: string;
}

/**
 * Unified user lookup for Stripe webhooks
 * Consolidates the repeated user lookup logic across all webhook handlers
 */
export async function lookupFirebaseUser(
  customer: Stripe.Customer, 
  session?: Stripe.Checkout.Session
): Promise<StripeUserLookupResult> {
  let userId: string | null = null;
  let email: string = customer.email || '';
  let source: StripeUserLookupResult['source'] = 'not_found';

  // 1. Try to get userId from session metadata (most reliable)
  if (session?.metadata?.userId) {
    userId = session.metadata.userId;
    email = session.customer_details?.email || customer.email || email;
    source = 'metadata';
    console.log('✅ Found userId in session metadata:', userId);
  }
  
  // 2. Try to get userId from customer metadata
  else if (customer.metadata?.userId) {
    userId = customer.metadata.userId;
    source = 'metadata';
    console.log('✅ Found userId in customer metadata:', userId);
  }

  // 3. Try to look up user by email in Firebase Auth
  else if (email) {
    try {
      const auth = getAuth();
      const userRecord = await auth.getUserByEmail(email);
      userId = userRecord.uid;
      source = 'email_lookup';
      console.log('✅ Found user by email lookup:', email, '→', userId);
    } catch (error) {
      console.warn('⚠️ User not found by email in Firebase Auth:', email);
    }
  }

  // 4. Fallback to customer email
  if (!email && customer.email) {
    email = customer.email;
    source = 'customer_data';
  }

  const result: StripeUserLookupResult = {
    userId,
    email,
    found: !!userId,
    source
  };

  console.log('🔍 User lookup result:', result);
  return result;
}

/**
 * Create or update premium user record in Firestore
 * Consolidates the premium user creation logic
 */
export async function createOrUpdatePremiumUser(data: PremiumUserData): Promise<void> {
  try {
    const { userId, email, subscriptionStatus, stripeCustomerId, source, ...otherData } = data;

    // Get existing premium user record if it exists
    const premiumUserRef = adminDb.collection('premium_users').doc(userId);
    const existingDoc = await premiumUserRef.get();
    const existingData = existingDoc.exists ? existingDoc.data() : null;

    // Prepare the premium user record
    const premiumUserData = {
      userId,
      email,
      subscriptionStatus,
      stripeCustomerId,
      stripeSubscriptionId: otherData.stripeSubscriptionId || existingData?.stripeSubscriptionId || null,
      subscriptionStartDate: otherData.subscriptionStartDate || existingData?.subscriptionStartDate || null,
      subscriptionEndDate: otherData.subscriptionEndDate || existingData?.subscriptionEndDate || null,
      subscriptionPriceId: otherData.subscriptionPriceId || existingData?.subscriptionPriceId || null,
      deviceFingerprints: existingData?.deviceFingerprints || {},
      dailyUsageData: existingData?.dailyUsageData || {},
      preferences: existingData?.preferences || {
        theme: 'light',
        ttsEnabled: true,
        language: 'en'
      },
      metadata: {
        createdAt: existingData?.metadata?.createdAt || new Date(),
        updatedAt: new Date(),
        lastAccess: new Date(),
        version: 1,
        source: source
      }
    };

    // Write to premium_users collection
    await premiumUserRef.set(premiumUserData, { merge: false });
    console.log('✅ Premium user record created/updated:', userId);

    // Also set Firebase custom claims for backward compatibility
    await updateFirebaseCustomClaims(userId, subscriptionStatus, stripeCustomerId, otherData.stripeSubscriptionId);

  } catch (error) {
    console.error('❌ Failed to create/update premium user:', error);
    throw error;
  }
}

/**
 * Update Firebase custom claims for backward compatibility
 */
export async function updateFirebaseCustomClaims(
  userId: string,
  subscriptionStatus: 'premium' | 'limited',
  stripeCustomerId?: string,
  stripeSubscriptionId?: string
): Promise<void> {
  try {
    const auth = getAuth();
    const customClaims = {
      subscriptionStatus: subscriptionStatus,
      stripeCustomerId: stripeCustomerId || null,
      stripeSubscriptionId: stripeSubscriptionId || null,
      premium: subscriptionStatus === 'premium',
      stripeRole: subscriptionStatus === 'premium' ? 'premium' : null
    };

    await auth.setCustomUserClaims(userId, customClaims);
    console.log('✅ Firebase custom claims updated:', userId);
  } catch (error) {
    console.warn('⚠️ Failed to set custom claims (non-critical):', error);
  }
}

/**
 * Extract subscription data from Stripe subscription object
 */
export function extractSubscriptionData(subscription: Stripe.Subscription): {
  subscriptionStartDate: Date;
  subscriptionEndDate: Date;
  subscriptionPriceId: string | null;
} {
  return {
    subscriptionStartDate: new Date(subscription.created * 1000),
    subscriptionEndDate: new Date(subscription.current_period_end * 1000),
    subscriptionPriceId: subscription.items.data[0]?.price.id || null
  };
}

/**
 * Determine subscription status from Stripe subscription
 */
export function getSubscriptionStatus(subscription: Stripe.Subscription): 'premium' | 'limited' {
  const activeStatuses = ['active', 'trialing'];
  return activeStatuses.includes(subscription.status) ? 'premium' : 'limited';
}

/**
 * Log webhook processing for debugging
 */
export function logWebhookEvent(eventType: string, details: any): void {
  console.log(`🎣 Processing ${eventType}:`, {
    ...details,
    timestamp: new Date().toISOString()
  });
}