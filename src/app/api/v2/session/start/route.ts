/**
 * Session Start Endpoint - Authenticated session creation only
 * 
 * This endpoint handles session creation for authenticated users only.
 * Users must be authenticated to start a session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { generateSessionJWT } from '@/lib/middleware/auth';
import { getAuth } from 'firebase-admin/auth';

// Force dynamic rendering to prevent static caching
export const dynamic = 'force-dynamic';

// JWT expiration configuration (environment-based)  
const JWT_EXPIRATION = {
  development: 7200000, // 2 hours for development
  production: 7200000   // 2 hours for production
};

// Get JWT expiration based on environment
const getJWTExpiration = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  return isDevelopment ? JWT_EXPIRATION.development : JWT_EXPIRATION.production;
};

interface SessionStartRequest {
  userId?: string;
  email?: string;
  deviceFingerprint: string;
  userAgent?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SessionStartRequest = await request.json();
    const { userId, email, deviceFingerprint, userAgent } = body;

    if (!deviceFingerprint) {
      return NextResponse.json({
        error: 'Device fingerprint is required',
        code: 'DEVICE_FINGERPRINT_REQUIRED'
      }, { status: 400 });
    }

    // Get client IP
    const clientIP = request.ip || 
                     request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    // Require authentication for all users
    if (!userId || !email) {
      return NextResponse.json({
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Please sign in to use the extension'
      }, { status: 401 });
    }

    // Process authenticated user - use flexible validation like auth-status endpoint
    let userData;
    let customClaims = null;

    // FIRST: Check Firebase custom claims (primary source of truth)
    try {
      const auth = getAuth();
      const userRecord = await auth.getUser(userId);
      customClaims = userRecord.customClaims || {};
      
      // Support both old Stripe claims and new Firebase Extension claims
      if (customClaims.stripeRole === 'premium' || customClaims.premium === true || customClaims.subscriptionStatus === 'premium') {
        console.log('✅ User has premium custom claims in session start (Firebase Extension or legacy Stripe)');
        // If user has premium claims, use those
        userData = {
          subscriptionStatus: 'premium',
          stripeCustomerId: customClaims.stripeCustomerId,
          stripeSubscriptionId: customClaims.stripeSubscriptionId,
          subscriptionStartDate: customClaims.subscriptionStartDate ? new Date(customClaims.subscriptionStartDate * 1000) : null,
          subscriptionEndDate: customClaims.subscriptionEndDate ? new Date(customClaims.subscriptionEndDate * 1000) : null,
          email: userRecord.email || email
        };
      }
    } catch (error) {
      console.warn('Failed to get custom claims in session start:', error);
    }

    // SECOND: Check Firestore if no premium claims found
    if (!userData) {
      const userDoc = await adminDb.collection('users').doc(userId).get();
      if (userDoc.exists) {
        userData = userDoc.data();
      }
    }
    
    // THIRD: If not found by ID, try email lookup as fallback
    if (!userData) {
      try {
        const querySnapshot = await adminDb.collection('users').where('email', '==', email).limit(1).get();
        if (!querySnapshot.empty) {
          userData = querySnapshot.docs[0].data();
        }
      } catch (error) {
        console.warn('Failed to lookup user by email:', error);
      }
    }
    
    if (!userData) {
      return NextResponse.json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      }, { status: 404 });
    }

    // Note: Removed strict email validation to match auth-status endpoint behavior

      // Create authenticated session
      const sessionId = `auth_${userId}_${Date.now()}`;
      const sessionRef = adminDb.collection('sessions').doc(sessionId);
      
      await sessionRef.set({
        sessionId,
        userId,
        email,
        subscriptionStatus: userData?.subscriptionStatus || 'anonymous',
        deviceFingerprint,
        ipAddress: clientIP,
        userAgent: userAgent || request.headers.get('user-agent') || 'unknown',
        startTime: new Date(),
        lastActivity: new Date(),
        lastHeartbeat: new Date(),
        totalUsageTime: 0,
        heartbeatCount: 0,
        status: 'active',
        type: 'authenticated'
      });

      // Generate JWT for authenticated session
      const jwt = generateSessionJWT({
        sessionId,
        userId,
        deviceFingerprint,
        ipAddress: clientIP,
        subscriptionStatus: userData?.subscriptionStatus || 'limited'
      }, getJWTExpiration()); // Environment-based expiration

      console.log('✅ Created authenticated session:', sessionId);

      return NextResponse.json({
        success: true,
        sessionType: 'authenticated',
        sessionId,
        token: jwt,
        expiresIn: Math.floor(getJWTExpiration() / 1000), // Environment-based expiration in seconds
        subscriptionStatus: userData?.subscriptionStatus || 'limited',
        dailyLimit: (userData?.subscriptionStatus === 'premium' || customClaims?.stripeRole === 'premium') ? -1 : 3600000 // 1 hour for production (3600000ms)
      });

  } catch (error) {
    console.error('Error starting session:', error);
    return NextResponse.json({
      error: 'Failed to start session',
      code: 'SESSION_START_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}