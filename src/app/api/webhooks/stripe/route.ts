import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';

// Force dynamic rendering to prevent static caching
export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil' as const,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    console.log('🎯 Stripe webhook received at:', new Date().toISOString());
    
    // Verify Firebase Admin is properly configured
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
      console.error('❌ Missing Firebase Admin environment variables');
      return NextResponse.json({ error: 'Firebase Admin not configured' }, { status: 500 });
    }
    console.log('✅ Firebase Admin environment variables present');
    
    const body = await request.text();
    const signature = request.headers.get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log('✅ Webhook signature verified, event type:', event.type);
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;

      case 'customer.subscription.updated':
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(deletedSubscription);
        break;

      case 'invoice.payment_succeeded':
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(failedInvoice);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('🛒 Processing checkout completed for session:', session.id);
  console.log('📋 Session metadata:', session.metadata);
  console.log('🎯 SUBSCRIPTION FLOW DEBUG: Checkout completed', {
    sessionId: session.id,
    customerId: session.customer,
    subscriptionId: session.subscription,
    metadata: session.metadata,
    timestamp: new Date().toISOString()
  });
  
  const firebaseUID = session.metadata?.firebaseUID;
  if (!firebaseUID) {
    console.error('❌ No Firebase UID found in session metadata');
    return;
  }
  
  console.log('👤 Found Firebase UID:', firebaseUID);

  try {
    // Get subscription details
    const subscriptionId = session.subscription as string;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Cast to any to access properties - Stripe API version compatibility issue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sub = subscription as any;
    
    console.log('🔄 Setting Firebase custom claims for user:', firebaseUID);
    
    // PRIMARY: Set Firebase custom claims (this is what the extension should check)
    const auth = getAuth();
    const customClaims = {
      premium: true,
      subscriptionStatus: 'premium',
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription,
      subscriptionStartDate: sub.current_period_start,
      subscriptionEndDate: sub.current_period_end,
      updatedAt: Date.now()
    };
    
    await auth.setCustomUserClaims(firebaseUID, customClaims);
    console.log(`✅ Firebase custom claims set for user ${firebaseUID}`);
    console.log('🎯 SUBSCRIPTION FLOW DEBUG: Custom claims set', {
      userId: firebaseUID,
      claims: customClaims,
      timestamp: new Date().toISOString()
    });
    
    // SECONDARY: Update Firestore for backup/audit trail
    const userDocRef = adminDb.collection('users').doc(firebaseUID);
    const userDoc = await userDocRef.get();
    
    if (!userDoc.exists) {
      console.log('📝 Creating new user document for:', firebaseUID);
      await userDocRef.set({
        subscriptionStatus: 'premium',
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        subscriptionStartDate: new Date(sub.current_period_start * 1000),
        subscriptionEndDate: new Date(sub.current_period_end * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
        email: session.customer_details?.email || 'unknown',
      });
      console.log(`✅ New user document created for ${firebaseUID}`);
    } else {
      console.log('📝 Updating existing user document for:', firebaseUID);
      await userDocRef.update({
        subscriptionStatus: 'premium',
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        subscriptionStartDate: new Date(sub.current_period_start * 1000),
        subscriptionEndDate: new Date(sub.current_period_end * 1000),
        updatedAt: new Date(),
      });
      console.log(`✅ Existing user document updated for ${firebaseUID}`);
    }
  } catch (error) {
    console.error('❌ Error handling checkout completed:', error);
    console.error('❌ Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const firebaseUID = subscription.metadata?.firebaseUID;
  if (!firebaseUID) return;

  try {
    const status = subscription.status === 'active' ? 'premium' : 'cancelled';
    const isPremium = subscription.status === 'active';
    
    // PRIMARY: Update Firebase custom claims
    const auth = getAuth();
    await auth.setCustomUserClaims(firebaseUID, {
      premium: isPremium,
      subscriptionStatus: status,
      stripeCustomerId: subscription.customer,
      stripeSubscriptionId: subscription.id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      subscriptionEndDate: (subscription as any).current_period_end,
      updatedAt: Date.now()
    });
    console.log(`✅ Custom claims updated for user ${firebaseUID}: ${status}`);
    
    // SECONDARY: Update Firestore for backup
    await adminDb.collection('users').doc(firebaseUID).update({
      subscriptionStatus: status,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      subscriptionEndDate: new Date((subscription as any).current_period_end * 1000),
      updatedAt: new Date(),
    });

    console.log(`Subscription updated for user ${firebaseUID}: ${status}`);
  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const firebaseUID = subscription.metadata?.firebaseUID;
  if (!firebaseUID) return;

  try {
    // PRIMARY: Remove premium custom claims
    const auth = getAuth();
    await auth.setCustomUserClaims(firebaseUID, {
      premium: false,
      subscriptionStatus: 'free',
      stripeCustomerId: subscription.customer,
      stripeSubscriptionId: null,
      subscriptionEndDate: Date.now(),
      updatedAt: Date.now()
    });
    console.log(`✅ Custom claims removed for user ${firebaseUID}`);
    
    // SECONDARY: Update Firestore for backup
    await adminDb.collection('users').doc(firebaseUID).update({
      subscriptionStatus: 'free',
      subscriptionEndDate: new Date(),
      updatedAt: new Date(),
    });

    console.log(`Subscription cancelled for user ${firebaseUID}`);
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // Update subscription end date when payment succeeds
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subscriptionId = (invoice as any).subscription as string;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const firebaseUID = (subscription as any).metadata?.firebaseUID;
  
  if (!firebaseUID) return;

  try {
    await adminDb.collection('users').doc(firebaseUID).update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      subscriptionEndDate: new Date((subscription as any).current_period_end * 1000),
      updatedAt: new Date(),
    });

    console.log(`Payment succeeded for user ${firebaseUID}`);
  } catch (error) {
    console.error('Error handling payment succeeded:', error);
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Handle failed payment - could downgrade user or send notification
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subscriptionId = (invoice as any).subscription as string;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const firebaseUID = (subscription as any).metadata?.firebaseUID;
  
  if (!firebaseUID) return;

  console.log(`Payment failed for user ${firebaseUID}`);
  // Add logic to handle failed payments (notifications, grace period, etc.)
}