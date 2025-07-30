/**
 * Session Start Endpoint - Authenticated session creation only
 * 
 * This endpoint handles session creation for authenticated users only.
 * Users must be authenticated to start a session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { generateSessionJWT } from '@/lib/middleware/auth';
import { getPremiumStatus } from '@/lib/services/premium-status';

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

    // Use consolidated premium status service
    console.log('🔍 Checking premium status for session start:', { userId, email, deviceFingerprint });
    const premiumStatus = await getPremiumStatus({ userId, email, deviceFingerprint });
    
    if (!premiumStatus.found && !premiumStatus.userId && !premiumStatus.email) {
      return NextResponse.json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      }, { status: 404 });
    }

    const userData = {
      subscriptionStatus: premiumStatus.subscriptionStatus,
      stripeCustomerId: premiumStatus.stripeCustomerId,
      stripeSubscriptionId: premiumStatus.stripeSubscriptionId,
      subscriptionStartDate: premiumStatus.subscriptionStartDate,
      subscriptionEndDate: premiumStatus.subscriptionEndDate,
      email: premiumStatus.email || email
    };

    // Note: Removed strict email validation to match auth-status endpoint behavior

    // Create authenticated session
    const sessionId = `auth_${userId}_${Date.now()}`;
    const sessionRef = adminDb.collection('sessions').doc(sessionId);
    
    await sessionRef.set({
      sessionId,
      userId,
      email: premiumStatus.email || email,
      subscriptionStatus: premiumStatus.subscriptionStatus,
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
      subscriptionStatus: premiumStatus.subscriptionStatus
    }, getJWTExpiration()); // Environment-based expiration

    console.log('✅ Created authenticated session:', {
      sessionId,
      subscriptionStatus: premiumStatus.subscriptionStatus,
      source: premiumStatus.source
    });

    return NextResponse.json({
      success: true,
      sessionType: 'authenticated',
      sessionId,
      token: jwt,
      expiresIn: Math.floor(getJWTExpiration() / 1000), // Environment-based expiration in seconds
      subscriptionStatus: premiumStatus.subscriptionStatus,
      dailyLimit: premiumStatus.subscriptionStatus === 'premium' ? -1 : 3600000, // 1 hour for limited users
      premiumSource: premiumStatus.source // Debug info
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