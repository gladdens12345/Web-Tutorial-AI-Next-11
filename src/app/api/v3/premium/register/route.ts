/**
 * Premium User Registration API - V3
 * 
 * Creates or updates premium_users collection records
 * Used by Stripe webhooks and subscription success page
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface PremiumUserRegistration {
  userId: string;
  email: string;
  subscriptionStatus: 'premium' | 'limited';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStartDate?: string; // ISO string
  subscriptionEndDate?: string;   // ISO string
  subscriptionPriceId?: string;
  deviceFingerprint?: string;
  userAgent?: string;
  source?: string; // webhook, manual, subscription-success
}

export async function POST(request: NextRequest) {
  try {
    const body: PremiumUserRegistration = await request.json();
    const {
      userId,
      email,
      subscriptionStatus,
      stripeCustomerId,
      stripeSubscriptionId,
      subscriptionStartDate,
      subscriptionEndDate,
      subscriptionPriceId,
      deviceFingerprint,
      userAgent,
      source = 'manual'
    } = body;

    // Validate required fields
    if (!userId || !email) {
      return NextResponse.json({
        error: 'userId and email are required',
        code: 'MISSING_REQUIRED_FIELDS'
      }, { status: 400 });
    }

    console.log('🔄 Registering premium user:', { userId, email, subscriptionStatus, source });

    // Get existing premium user record if it exists
    const premiumUserRef = adminDb.collection('premium_users').doc(userId);
    const existingDoc = await premiumUserRef.get();
    const existingData = existingDoc.exists ? existingDoc.data() : null;

    // Prepare device fingerprints object
    let deviceFingerprints = existingData?.deviceFingerprints || {};
    if (deviceFingerprint && userAgent) {
      deviceFingerprints[deviceFingerprint] = {
        fingerprint: deviceFingerprint,
        createdAt: new Date(),
        lastSeen: new Date(),
        userAgent: userAgent
      };
    }

    // Prepare the premium user record
    const premiumUserData = {
      userId,
      email,
      subscriptionStatus: subscriptionStatus || 'limited',
      stripeCustomerId: stripeCustomerId || existingData?.stripeCustomerId || null,
      stripeSubscriptionId: stripeSubscriptionId || existingData?.stripeSubscriptionId || null,
      subscriptionStartDate: subscriptionStartDate ? new Date(subscriptionStartDate) : existingData?.subscriptionStartDate || null,
      subscriptionEndDate: subscriptionEndDate ? new Date(subscriptionEndDate) : existingData?.subscriptionEndDate || null,
      subscriptionPriceId: subscriptionPriceId || existingData?.subscriptionPriceId || null,
      deviceFingerprints,
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
    console.log('✅ Premium user registered successfully:', userId);

    // Also set Firebase custom claims for backward compatibility
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

    // Return success response
    return NextResponse.json({
      success: true,
      userId,
      email,
      subscriptionStatus,
      premiumUser: premiumUserData,
      message: 'Premium user registered successfully'
    });

  } catch (error) {
    console.error('❌ Premium user registration error:', error);
    return NextResponse.json({
      error: 'Failed to register premium user',
      code: 'REGISTRATION_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body: Partial<PremiumUserRegistration> & { userId: string } = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({
        error: 'userId is required for updates',
        code: 'MISSING_USER_ID'
      }, { status: 400 });
    }

    console.log('🔄 Updating premium user:', userId);

    const premiumUserRef = adminDb.collection('premium_users').doc(userId);
    const existingDoc = await premiumUserRef.get();

    if (!existingDoc.exists) {
      return NextResponse.json({
        error: 'Premium user not found',
        code: 'USER_NOT_FOUND'
      }, { status: 404 });
    }

    // Prepare update data (only include non-undefined fields)
    const updateData: any = {
      'metadata.updatedAt': new Date(),
      'metadata.lastAccess': new Date()
    };

    if (body.email !== undefined) updateData.email = body.email;
    if (body.subscriptionStatus !== undefined) updateData.subscriptionStatus = body.subscriptionStatus;
    if (body.stripeCustomerId !== undefined) updateData.stripeCustomerId = body.stripeCustomerId;
    if (body.stripeSubscriptionId !== undefined) updateData.stripeSubscriptionId = body.stripeSubscriptionId;
    if (body.subscriptionStartDate !== undefined) updateData.subscriptionStartDate = new Date(body.subscriptionStartDate);
    if (body.subscriptionEndDate !== undefined) updateData.subscriptionEndDate = new Date(body.subscriptionEndDate);
    if (body.subscriptionPriceId !== undefined) updateData.subscriptionPriceId = body.subscriptionPriceId;

    // Handle device fingerprint registration
    if (body.deviceFingerprint && body.userAgent) {
      updateData[`deviceFingerprints.${body.deviceFingerprint}`] = {
        fingerprint: body.deviceFingerprint,
        createdAt: new Date(),
        lastSeen: new Date(),
        userAgent: body.userAgent
      };
    }

    await premiumUserRef.update(updateData);
    console.log('✅ Premium user updated successfully:', userId);

    // Update custom claims if subscription status changed
    if (body.subscriptionStatus !== undefined) {
      try {
        const auth = getAuth();
        const customClaims = {
          subscriptionStatus: body.subscriptionStatus,
          premium: body.subscriptionStatus === 'premium',
          stripeRole: body.subscriptionStatus === 'premium' ? 'premium' : null
        };

        await auth.setCustomUserClaims(userId, customClaims);
        console.log('✅ Firebase custom claims updated for status change:', userId);
      } catch (error) {
        console.warn('⚠️ Failed to update custom claims (non-critical):', error);
      }
    }

    return NextResponse.json({
      success: true,
      userId,
      message: 'Premium user updated successfully'
    });

  } catch (error) {
    console.error('❌ Premium user update error:', error);
    return NextResponse.json({
      error: 'Failed to update premium user',
      code: 'UPDATE_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}