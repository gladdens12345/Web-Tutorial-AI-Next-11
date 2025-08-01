/**
 * Stripe Webhook Handler for Premium Users
 * 
 * Automatically creates/updates premium_users records when Stripe events occur
 * Works alongside the existing Firebase Stripe Extension
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getAuth } from 'firebase-admin/auth';
import { adminDb } from '@/lib/firebase-admin';
import { 
  lookupFirebaseUser, 
  createOrUpdatePremiumUser, 
  extractSubscriptionData, 
  getSubscriptionStatus,
  logWebhookEvent
} from '@/lib/services/stripe-webhook-utils';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('❌ Missing Stripe signature');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      const error = err as Error;
      console.error('❌ Webhook signature verification failed:', error.message);
      return NextResponse.json({ 
        error: `Webhook Error: ${error.message}` 
      }, { status: 400 });
    }

    console.log('🎣 Stripe webhook received:', {
      type: event.type,
      id: event.id,
      timestamp: new Date(event.created * 1000).toISOString(),
      livemode: event.livemode
    });

    // Handle different event types with comprehensive error handling
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          console.log('💳 Processing checkout completion...');
          await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          console.log('✅ Checkout completion processed successfully');
          break;

        case 'customer.subscription.created':
          console.log('🔔 Processing subscription creation...');
          await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          console.log('✅ Subscription creation processed successfully');
          break;

        case 'customer.subscription.updated':
          console.log('🔄 Processing subscription update...');
          await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          console.log('✅ Subscription update processed successfully');
          break;

        case 'customer.subscription.deleted':
          console.log('❌ Processing subscription deletion...');
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          console.log('✅ Subscription deletion processed successfully');
          break;

        case 'invoice.payment_succeeded':
          console.log('💰 Processing successful payment...');
          await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          console.log('✅ Payment success processed successfully');
          break;

        case 'invoice.payment_failed':
          console.log('💸 Processing failed payment...');
          await handlePaymentFailed(event.data.object as Stripe.Invoice);
          console.log('✅ Payment failure processed successfully');
          break;

        default:
          console.log(`⚠️ Unhandled event type: ${event.type}`);
      }

      // Log successful webhook processing
      console.log('✅ Webhook processed successfully:', {
        type: event.type,
        id: event.id,
        processingTime: Date.now() - event.created * 1000
      });

    } catch (eventError) {
      console.error('❌ Error processing webhook event:', {
        type: event.type,
        id: event.id,
        error: eventError instanceof Error ? {
          name: eventError.name,
          message: eventError.message,
          stack: eventError.stack
        } : eventError
      });
      
      // Still return success to Stripe to avoid retries for application errors
      // Only return error for actual system failures
      if (eventError instanceof Error && eventError.message.includes('network')) {
        throw eventError; // Let outer catch handle network errors
      }
    }

    return NextResponse.json({ 
      received: true,
      eventType: event.type,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Webhook handler error:', error);
    return NextResponse.json({
      error: 'Webhook processing failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Handle successful checkout completion
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  logWebhookEvent('checkout.session.completed', { sessionId: session.id });

  try {
    // Get customer and subscription details
    const customerId = session.customer as string;
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    
    // Get the subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1
    });

    const subscription = subscriptions.data[0];
    if (!subscription) {
      console.warn('⚠️ No active subscription found for customer:', customerId);
      return;
    }

    // Use consolidated user lookup
    const userLookup = await lookupFirebaseUser(customer, session);
    if (!userLookup.found || !userLookup.userId) {
      console.error('❌ Cannot find userId for customer:', customerId);
      return;
    }

    // Extract subscription data
    const subscriptionData = extractSubscriptionData(subscription);

    // Create premium user record using consolidated utility
    await createOrUpdatePremiumUser({
      userId: userLookup.userId,
      email: userLookup.email,
      subscriptionStatus: getSubscriptionStatus(subscription),
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      ...subscriptionData,
      source: 'checkout_completed'
    });

    console.log('✅ Premium user created from checkout completion:', userLookup.userId);

  } catch (error) {
    console.error('❌ Error processing checkout completion:', error);
  }
}

/**
 * Handle subscription creation
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('🔄 Processing subscription creation:', subscription.id);

  try {
    const customerId = subscription.customer as string;
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    
    const email = customer.email;
    if (!email) {
      console.error('❌ No email found for customer:', customerId);
      return;
    }

    // Find user by email
    let userId: string | null = null;
    try {
      const auth = getAuth();
      const userRecord = await auth.getUserByEmail(email);
      userId = userRecord.uid;
    } catch (error) {
      console.warn('⚠️ User not found by email:', email);
      return;
    }

    if (!userId) return;

    await createPremiumUserRecord({
      userId,
      email,
      customerId,
      subscription,
      source: 'subscription_created'
    });

    console.log('✅ Premium user created from subscription creation:', userId);

  } catch (error) {
    console.error('❌ Error processing subscription creation:', error);
  }
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('🔄 Processing subscription update:', subscription.id);

  try {
    const customerId = subscription.customer as string;
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    
    const email = customer.email;
    if (!email) return;

    // Find user by email
    let userId: string | null = null;
    try {
      const auth = getAuth();
      const userRecord = await auth.getUserByEmail(email);
      userId = userRecord.uid;
    } catch (error) {
      return;
    }

    if (!userId) return;

    // Update subscription status based on Stripe status
    const subscriptionStatus = subscription.status === 'active' ? 'premium' : 'limited';

    await updatePremiumUserRecord(userId, {
      subscriptionStatus,
      stripeSubscriptionId: subscription.id,
      subscriptionEndDate: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      source: 'subscription_updated'
    });

    console.log('✅ Premium user updated from subscription update:', userId);

  } catch (error) {
    console.error('❌ Error processing subscription update:', error);
  }
}

/**
 * Handle subscription deletion/cancellation
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('🗑️ Processing subscription deletion:', subscription.id);

  try {
    const customerId = subscription.customer as string;
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    
    const email = customer.email;
    if (!email) return;

    // Find user by email
    let userId: string | null = null;
    try {
      const auth = getAuth();
      const userRecord = await auth.getUserByEmail(email);
      userId = userRecord.uid;
    } catch (error) {
      return;
    }

    if (!userId) return;

    // Downgrade to limited status
    await updatePremiumUserRecord(userId, {
      subscriptionStatus: 'limited',
      subscriptionEndDate: new Date(subscription.canceled_at! * 1000),
      source: 'subscription_deleted'
    });

    console.log('✅ Premium user downgraded from subscription deletion:', userId);

  } catch (error) {
    console.error('❌ Error processing subscription deletion:', error);
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('💰 Processing payment success:', invoice.id);

  try {
    if (!invoice.subscription) return;

    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    const customerId = subscription.customer as string;
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    
    const email = customer.email;
    if (!email) return;

    let userId: string | null = null;
    try {
      const auth = getAuth();
      const userRecord = await auth.getUserByEmail(email);
      userId = userRecord.uid;
    } catch (error) {
      return;
    }

    if (!userId) return;

    // Ensure user is premium after successful payment
    await updatePremiumUserRecord(userId, {
      subscriptionStatus: 'premium',
      source: 'payment_succeeded'
    });

    console.log('✅ Premium status confirmed after payment success:', userId);

  } catch (error) {
    console.error('❌ Error processing payment success:', error);
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('💸 Processing payment failure:', invoice.id);
  // For now, we'll just log it. You might want to send notifications or update status
}

/**
 * Create a premium user record
 */
async function createPremiumUserRecord({
  userId,
  email,
  customerId,
  subscription,
  source
}: {
  userId: string;
  email: string;
  customerId: string;
  subscription: Stripe.Subscription;
  source: string;
}) {
  const priceId = subscription.items.data[0]?.price.id;
  
  const premiumUserData = {
    userId,
    email,
    subscriptionStatus: 'premium' as const,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    subscriptionStartDate: new Date(subscription.created * 1000),
    subscriptionEndDate: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
    subscriptionPriceId: priceId,
    deviceFingerprints: {},
    dailyUsageData: {},
    preferences: {
      theme: 'light',
      ttsEnabled: true,
      language: 'en'
    },
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
      lastAccess: new Date(),
      version: 1,
      source: source
    }
  };

  // Use atomic transaction to prevent race conditions
  const premiumUserRef = adminDb.collection('premium_users').doc(userId);
  
  try {
    await adminDb.runTransaction(async (transaction) => {
      const existingDoc = await transaction.get(premiumUserRef);
      
      if (existingDoc.exists) {
        // Update existing record
        const updateData = {
          ...premiumUserData,
          'metadata.updatedAt': new Date(),
          'metadata.lastAccess': new Date(),
          'metadata.version': (existingDoc.data()?.metadata?.version || 0) + 1
        };
        transaction.update(premiumUserRef, updateData);
        console.log('✅ Updated existing premium user record:', userId);
      } else {
        // Create new record
        transaction.set(premiumUserRef, premiumUserData);
        console.log('✅ Created new premium user record:', userId);
      }
    });

    // Set Firebase custom claims for backward compatibility (outside transaction)
    try {
      const auth = getAuth();
      await auth.setCustomUserClaims(userId, {
        subscriptionStatus: 'premium',
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        premium: true,
        stripeRole: 'premium'
      });
      console.log('✅ Set custom claims for user:', userId);
    } catch (error) {
      console.warn('⚠️ Failed to set custom claims:', error);
    }

  } catch (error) {
    console.error('❌ Failed to create/update premium user record:', error);
    throw error;
  }
}

/**
 * Update existing premium user record
 */
async function updatePremiumUserRecord(userId: string, updates: any) {
  const premiumUserRef = adminDb.collection('premium_users').doc(userId);
  
  try {
    await adminDb.runTransaction(async (transaction) => {
      const existingDoc = await transaction.get(premiumUserRef);
      
      if (existingDoc.exists) {
        const currentData = existingDoc.data();
        const updateData = {
          ...updates,
          'metadata.updatedAt': new Date(),
          'metadata.lastAccess': new Date(),
          'metadata.version': (currentData?.metadata?.version || 0) + 1
        };
        
        transaction.update(premiumUserRef, updateData);
        console.log('✅ Updated premium user record:', userId);
      } else {
        console.warn('⚠️ Premium user record not found for update:', userId);
        // Create the record if it doesn't exist
        const newData = {
          userId,
          subscriptionStatus: updates.subscriptionStatus || 'premium',
          ...updates,
          metadata: {
            createdAt: new Date(),
            updatedAt: new Date(),
            lastAccess: new Date(),
            version: 1,
            source: 'webhook_update'
          }
        };
        transaction.set(premiumUserRef, newData);
        console.log('✅ Created premium user record during update:', userId);
      }
    });

    // Update custom claims if subscription status changed (outside transaction)
    if (updates.subscriptionStatus) {
      try {
        const auth = getAuth();
        await auth.setCustomUserClaims(userId, {
          subscriptionStatus: updates.subscriptionStatus,
          premium: updates.subscriptionStatus === 'premium',
          stripeRole: updates.subscriptionStatus === 'premium' ? 'premium' : null
        });
        console.log('✅ Updated custom claims for user:', userId);
      } catch (error) {
        console.warn('⚠️ Failed to update custom claims:', error);
      }
    }

  } catch (error) {
    console.error('❌ Failed to update premium user record:', error);
    throw error;
  }
}