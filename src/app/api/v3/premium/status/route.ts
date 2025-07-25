/**
 * Premium Users Status API - V3
 * 
 * Single source of truth for premium user status checking
 * Replaces complex sessions-based system with simple premium_users collection lookup
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface PremiumStatusRequest {
  userId?: string;
  email?: string;
  deviceFingerprint?: string;
}

interface PremiumUserRecord {
  userId: string;
  email: string;
  subscriptionStatus: 'premium' | 'limited';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  deviceFingerprints?: Record<string, any>;
  dailyUsageData?: Record<string, any>;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    lastAccess?: Date;
    version: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');
    const deviceFingerprint = request.headers.get('X-Device-Fingerprint');

    // Require at least userId or email
    if (!userId && !email) {
      return NextResponse.json({
        error: 'Either userId or email is required',
        code: 'MISSING_IDENTIFIER'
      }, { status: 400 });
    }

    console.log('🔍 Premium status check for:', { userId, email, deviceFingerprint });

    let premiumStatus = await checkPremiumStatus({ userId, email, deviceFingerprint });

    // If not found in premium_users, check fallback sources (for backward compatibility)
    if (!premiumStatus.found) {
      premiumStatus = await checkFallbackSources({ userId, email });
    }

    const response = {
      success: true,
      userId: premiumStatus.userId,
      email: premiumStatus.email,
      subscriptionStatus: premiumStatus.subscriptionStatus,
      dailyTimeRemaining: premiumStatus.subscriptionStatus === 'premium' ? -1 : 3600000,
      deviceRegistered: premiumStatus.deviceRegistered,
      subscriptionEndDate: premiumStatus.subscriptionEndDate,
      features: {
        unlimitedTime: premiumStatus.subscriptionStatus === 'premium',
        knowledgeBase: premiumStatus.subscriptionStatus === 'premium',
        priority: premiumStatus.subscriptionStatus === 'premium'
      },
      source: premiumStatus.source
    };

    console.log('✅ Premium status response:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Premium status check error:', error);
    return NextResponse.json({
      error: 'Failed to check premium status',
      code: 'PREMIUM_STATUS_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: PremiumStatusRequest = await request.json();
    const { userId, email, deviceFingerprint } = body;

    // Same logic as GET but with POST body
    if (!userId && !email) {
      return NextResponse.json({
        error: 'Either userId or email is required',
        code: 'MISSING_IDENTIFIER'
      }, { status: 400 });
    }

    console.log('🔍 Premium status check (POST) for:', { userId, email, deviceFingerprint });

    let premiumStatus = await checkPremiumStatus({ userId, email, deviceFingerprint });

    if (!premiumStatus.found) {
      premiumStatus = await checkFallbackSources({ userId, email });
    }

    const response = {
      success: true,
      userId: premiumStatus.userId,
      email: premiumStatus.email,
      subscriptionStatus: premiumStatus.subscriptionStatus,
      dailyTimeRemaining: premiumStatus.subscriptionStatus === 'premium' ? -1 : 3600000,
      deviceRegistered: premiumStatus.deviceRegistered,
      subscriptionEndDate: premiumStatus.subscriptionEndDate,
      features: {
        unlimitedTime: premiumStatus.subscriptionStatus === 'premium',
        knowledgeBase: premiumStatus.subscriptionStatus === 'premium',
        priority: premiumStatus.subscriptionStatus === 'premium'
      },
      source: premiumStatus.source
    };

    console.log('✅ Premium status response (POST):', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Premium status check error (POST):', error);
    return NextResponse.json({
      error: 'Failed to check premium status',
      code: 'PREMIUM_STATUS_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Check premium status from premium_users collection (primary source)
 */
async function checkPremiumStatus({ userId, email, deviceFingerprint }: PremiumStatusRequest) {
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
      const data = premiumUserDoc.data() as PremiumUserRecord;
      
      // Update last access time
      await premiumUserDoc.ref.update({
        'metadata.lastAccess': new Date(),
        'metadata.updatedAt': new Date()
      });

      // Check if device is registered
      const deviceRegistered = deviceFingerprint ? 
        !!data.deviceFingerprints?.[deviceFingerprint] : false;

      console.log('✅ Found premium user in premium_users collection:', data.userId);

      return {
        found: true,
        userId: data.userId,
        email: data.email,
        subscriptionStatus: data.subscriptionStatus,
        subscriptionEndDate: data.subscriptionEndDate,
        deviceRegistered,
        source: 'premium_users'
      };
    }

    return {
      found: false,
      userId: userId || null,
      email: email || null,
      subscriptionStatus: 'limited' as const,
      subscriptionEndDate: null,
      deviceRegistered: false,
      source: 'not_found'
    };

  } catch (error) {
    console.error('Error checking premium_users collection:', error);
    return {
      found: false,
      userId: userId || null,
      email: email || null,
      subscriptionStatus: 'limited' as const,
      subscriptionEndDate: null,
      deviceRegistered: false,
      source: 'error'
    };
  }
}

/**
 * Check fallback sources for backward compatibility
 * This ensures existing premium users (like gladdens123@gmail.com) continue working
 */
async function checkFallbackSources({ userId, email }: PremiumStatusRequest) {
  try {
    // Check Firebase custom claims (primary fallback)
    if (userId) {
      try {
        const auth = getAuth();
        const userRecord = await auth.getUser(userId);
        const customClaims = userRecord.customClaims || {};
        
        if (customClaims.stripeRole === 'premium' || customClaims.premium === true || customClaims.subscriptionStatus === 'premium') {
          console.log('✅ Found premium status in Firebase custom claims:', userId);
          
          return {
            found: true,
            userId: userId,
            email: userRecord.email || email || '',
            subscriptionStatus: 'premium' as const,
            subscriptionEndDate: null,
            deviceRegistered: false,
            source: 'custom_claims'
          };
        }
      } catch (error) {
        console.warn('Failed to check custom claims:', error);
      }
    }

    // Check Firebase Stripe Extension customers collection
    if (userId) {
      try {
        const subscriptionsSnapshot = await adminDb
          .collection('customers')
          .doc(userId)
          .collection('subscriptions')
          .where('status', 'in', ['active', 'trialing'])
          .get();
        
        if (!subscriptionsSnapshot.empty) {
          console.log('✅ Found active subscription in customers collection:', userId);
          
          return {
            found: true,
            userId: userId,
            email: email || '',
            subscriptionStatus: 'premium' as const,
            subscriptionEndDate: null,
            deviceRegistered: false,
            source: 'customers_collection'
          };
        }
      } catch (error) {
        console.warn('Failed to check customers collection:', error);
      }
    }

    // Check legacy users collection
    if (userId) {
      try {
        const userDoc = await adminDb.collection('users').doc(userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          if (userData?.subscriptionStatus === 'premium') {
            console.log('✅ Found premium status in legacy users collection:', userId);
            
            return {
              found: true,
              userId: userId,
              email: userData.email || email || '',
              subscriptionStatus: 'premium' as const,
              subscriptionEndDate: userData.subscriptionEndDate || null,
              deviceRegistered: false,
              source: 'users_collection'
            };
          }
        }
      } catch (error) {
        console.warn('Failed to check users collection:', error);
      }
    }

    // Default: limited user
    return {
      found: false,
      userId: userId || null,
      email: email || null,
      subscriptionStatus: 'limited' as const,
      subscriptionEndDate: null,
      deviceRegistered: false,
      source: 'default_limited'
    };

  } catch (error) {
    console.error('Error checking fallback sources:', error);
    return {
      found: false,
      userId: userId || null,
      email: email || null,
      subscriptionStatus: 'limited' as const,
      subscriptionEndDate: null,
      deviceRegistered: false,
      source: 'fallback_error'
    };
  }
}