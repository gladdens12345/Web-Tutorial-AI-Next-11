/**
 * Premium Status Service - Unified Premium User Validation
 * 
 * Single source of truth for premium status checking across all API endpoints.
 * Consolidates logic from multiple authentication endpoints to eliminate code duplication.
 */

import { adminDb } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';

export interface PremiumStatusRequest {
  userId?: string;
  email?: string;
  deviceFingerprint?: string;
}

export interface PremiumStatusResult {
  found: boolean;
  userId: string | null;
  email: string | null;
  subscriptionStatus: 'premium' | 'limited' | 'anonymous';
  subscriptionEndDate: Date | null;
  deviceRegistered: boolean;
  source: 'premium_users' | 'custom_claims' | 'customers_collection' | 'users_collection' | 'not_found' | 'error';
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStartDate?: Date | null;
  metadata?: {
    lastAccess?: Date;
    createdAt?: Date;
    updatedAt?: Date;
  };
}

/**
 * Check premium status using consolidated multi-source validation
 * This replaces all duplicate validation logic across API endpoints
 */
export async function getPremiumStatus(request: PremiumStatusRequest): Promise<PremiumStatusResult> {
  const { userId, email, deviceFingerprint } = request;

  // Require at least userId or email
  if (!userId && !email) {
    return createErrorResult('MISSING_IDENTIFIER', 'Either userId or email is required');
  }

  console.log('🔍 Premium status check for:', { userId, email, deviceFingerprint });

  // PRIMARY: Check premium_users collection (main source of truth)
  let result = await checkPremiumUsersCollection({ userId, email, deviceFingerprint });
  if (result.found) {
    console.log('✅ Found premium status in premium_users collection');
    return result;
  }

  // FALLBACK: Check other sources for backward compatibility
  result = await checkFallbackSources({ userId, email });
  if (result.found) {
    console.log('✅ Found premium status in fallback sources:', result.source);
    return result;
  }

  // DEFAULT: Limited user
  console.log('ℹ️ No premium status found, defaulting to limited');
  return {
    found: false,
    userId: userId || null,
    email: email || null,
    subscriptionStatus: 'limited',
    subscriptionEndDate: null,
    deviceRegistered: false,
    source: 'not_found'
  };
}

/**
 * Check premium_users collection (primary source)
 */
async function checkPremiumUsersCollection({ userId, email, deviceFingerprint }: PremiumStatusRequest): Promise<PremiumStatusResult> {
  try {
    let premiumUserDoc;

    // First try to find by userId
    if (userId) {
      premiumUserDoc = await adminDb.collection('premium_users').doc(userId).get();
    }

    // If not found and we have email, try to find by email
    if (!premiumUserDoc?.exists && email) {
      const emailQuery = await adminDb.collection('premium_users')
        .where('email', '==', email)
        .limit(1)
        .get();
      
      if (!emailQuery.empty) {
        premiumUserDoc = emailQuery.docs[0];
      }
    }

    if (premiumUserDoc?.exists) {
      const data = premiumUserDoc.data();
      
      // Update last access time
      await premiumUserDoc.ref.update({
        'metadata.lastAccess': new Date(),
        'metadata.updatedAt': new Date()
      });

      // Check if device is registered
      const deviceRegistered = deviceFingerprint ? 
        !!data.deviceFingerprints?.[deviceFingerprint] : false;

      return {
        found: true,
        userId: data.userId,
        email: data.email,
        subscriptionStatus: data.subscriptionStatus || 'limited',
        subscriptionEndDate: data.subscriptionEndDate ? new Date(data.subscriptionEndDate) : null,
        subscriptionStartDate: data.subscriptionStartDate ? new Date(data.subscriptionStartDate) : null,
        stripeCustomerId: data.stripeCustomerId,
        stripeSubscriptionId: data.stripeSubscriptionId,
        deviceRegistered,
        source: 'premium_users',
        metadata: {
          lastAccess: new Date(),
          createdAt: data.metadata?.createdAt,
          updatedAt: new Date()
        }
      };
    }

    return createNotFoundResult(userId, email);

  } catch (error) {
    console.error('Error checking premium_users collection:', error);
    return createErrorResult('PREMIUM_USERS_ERROR', error);
  }
}

/**
 * Check fallback sources for backward compatibility
 */
async function checkFallbackSources({ userId, email }: PremiumStatusRequest): Promise<PremiumStatusResult> {
  // 1. Check Firebase custom claims (primary fallback)
  if (userId) {
    const customClaimsResult = await checkFirebaseCustomClaims(userId, email);
    if (customClaimsResult.found) return customClaimsResult;
  }

  // 2. Check Firebase Stripe Extension customers collection
  if (userId) {
    const customersResult = await checkCustomersCollection(userId, email);
    if (customersResult.found) return customersResult;
  }

  // 3. Check legacy users collection
  if (userId) {
    const usersResult = await checkLegacyUsersCollection(userId, email);
    if (usersResult.found) return usersResult;
  }

  // 4. Email lookup in users collection (last resort)
  if (email) {
    const emailResult = await checkUsersByEmail(email);
    if (emailResult.found) return emailResult;
  }

  return createNotFoundResult(userId, email);
}

/**
 * Check Firebase custom claims
 */
async function checkFirebaseCustomClaims(userId: string, email?: string): Promise<PremiumStatusResult> {
  try {
    const auth = getAuth();
    const userRecord = await auth.getUser(userId);
    const customClaims = userRecord.customClaims || {};
    
    if (customClaims.stripeRole === 'premium' || customClaims.premium === true || customClaims.subscriptionStatus === 'premium') {
      return {
        found: true,
        userId: userId,
        email: userRecord.email || email || '',
        subscriptionStatus: 'premium',
        subscriptionEndDate: customClaims.subscriptionEndDate ? new Date(customClaims.subscriptionEndDate * 1000) : null,
        subscriptionStartDate: customClaims.subscriptionStartDate ? new Date(customClaims.subscriptionStartDate * 1000) : null,
        stripeCustomerId: customClaims.stripeCustomerId,
        stripeSubscriptionId: customClaims.stripeSubscriptionId,
        deviceRegistered: false,
        source: 'custom_claims'
      };
    }

    return createNotFoundResult(userId, email);
  } catch (error) {
    console.warn('Failed to check custom claims:', error);
    return createNotFoundResult(userId, email);
  }
}

/**
 * Check Firebase Stripe Extension customers collection
 */
async function checkCustomersCollection(userId: string, email?: string): Promise<PremiumStatusResult> {
  try {
    const subscriptionsSnapshot = await adminDb
      .collection('customers')
      .doc(userId)
      .collection('subscriptions')
      .where('status', 'in', ['active', 'trialing'])
      .get();
    
    if (!subscriptionsSnapshot.empty) {
      return {
        found: true,
        userId: userId,
        email: email || '',
        subscriptionStatus: 'premium',
        subscriptionEndDate: null,
        deviceRegistered: false,
        source: 'customers_collection'
      };
    }

    return createNotFoundResult(userId, email);
  } catch (error) {
    console.warn('Failed to check customers collection:', error);
    return createNotFoundResult(userId, email);
  }
}

/**
 * Check legacy users collection by userId
 */
async function checkLegacyUsersCollection(userId: string, email?: string): Promise<PremiumStatusResult> {
  try {
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      if (userData?.subscriptionStatus === 'premium') {
        return {
          found: true,
          userId: userId,
          email: userData.email || email || '',
          subscriptionStatus: 'premium',
          subscriptionEndDate: userData.subscriptionEndDate ? new Date(userData.subscriptionEndDate) : null,
          deviceRegistered: false,
          source: 'users_collection'
        };
      }
    }

    return createNotFoundResult(userId, email);
  } catch (error) {
    console.warn('Failed to check users collection:', error);
    return createNotFoundResult(userId, email);
  }
}

/**
 * Check legacy users collection by email
 */
async function checkUsersByEmail(email: string): Promise<PremiumStatusResult> {
  try {
    const querySnapshot = await adminDb.collection('users').where('email', '==', email).limit(1).get();
    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data();
      if (userData?.subscriptionStatus === 'premium') {
        return {
          found: true,
          userId: userData.userId || null,
          email: email,
          subscriptionStatus: 'premium',
          subscriptionEndDate: userData.subscriptionEndDate ? new Date(userData.subscriptionEndDate) : null,
          deviceRegistered: false,
          source: 'users_collection'
        };
      }
    }

    return createNotFoundResult(null, email);
  } catch (error) {
    console.warn('Failed to lookup user by email:', error);
    return createNotFoundResult(null, email);
  }
}

/**
 * Helper function to create not found result
 */
function createNotFoundResult(userId?: string | null, email?: string | null): PremiumStatusResult {
  return {
    found: false,
    userId: userId || null,
    email: email || null,
    subscriptionStatus: 'limited',
    subscriptionEndDate: null,
    deviceRegistered: false,
    source: 'not_found'
  };
}

/**
 * Helper function to create error result
 */
function createErrorResult(code: string, error: any): PremiumStatusResult {
  console.error(`Premium status error [${code}]:`, error);
  return {
    found: false,
    userId: null,
    email: null,
    subscriptionStatus: 'limited',
    subscriptionEndDate: null,
    deviceRegistered: false,
    source: 'error'
  };
}

/**
 * Format premium status result for API responses
 */
export function formatPremiumStatusResponse(result: PremiumStatusResult) {
  const dailyTimeRemaining = result.subscriptionStatus === 'premium' ? -1 : 3600000; // 1 hour for limited users

  return {
    success: true,
    userId: result.userId,
    email: result.email,
    subscriptionStatus: result.subscriptionStatus,
    dailyTimeRemaining,
    deviceRegistered: result.deviceRegistered,
    subscriptionEndDate: result.subscriptionEndDate,
    subscriptionStartDate: result.subscriptionStartDate,
    stripeCustomerId: result.stripeCustomerId,
    stripeSubscriptionId: result.stripeSubscriptionId,
    features: {
      unlimitedTime: result.subscriptionStatus === 'premium',
      knowledgeBase: result.subscriptionStatus === 'premium',
      priority: result.subscriptionStatus === 'premium'
    },
    source: result.source,
    metadata: result.metadata
  };
}

/**
 * Legacy support for auth-status endpoint response format
 */
export function formatAuthStatusResponse(result: PremiumStatusResult) {
  const subscriptionStatus = result.subscriptionStatus;

  // Convert any legacy trial status to limited
  if (subscriptionStatus === 'trial' || (!result.found && subscriptionStatus === 'limited')) {
    return {
      subscriptionStatus: 'limited',
      canUse: true,
      reason: 'limited_daily_access',
      timeRemaining: 3600000, // 1 hour
      hasKnowledgeBase: false,
      requiresSubscription: false
    };
  }

  // Premium users
  if (subscriptionStatus === 'premium') {
    return {
      subscriptionStatus: 'premium',
      canUse: true,
      reason: 'premium_unlimited',
      timeRemaining: -1, // Unlimited
      hasKnowledgeBase: true,
      subscriptionEndDate: result.subscriptionEndDate
    };
  }

  // Default: Limited users
  return {
    subscriptionStatus: 'limited',
    canUse: true,
    reason: 'limited_daily_access',
    timeRemaining: 3600000, // 1 hour
    hasKnowledgeBase: false,
    requiresSubscription: false
  };
}