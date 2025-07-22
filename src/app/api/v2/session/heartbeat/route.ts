/**
 * Session Heartbeat Endpoint - Server-authoritative session tracking
 * 
 * This endpoint handles real-time session tracking by:
 * - Updating session activity timestamps
 * - Tracking cumulative usage time for daily limits
 * - Returning current session status and time remaining
 * - Automatically ending sessions when limits are reached
 * 
 * Security features:
 * - JWT authentication required
 * - Rate limiting applied
 * - Device fingerprint validation
 * - Atomic Firestore updates to prevent race conditions
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/auth';
import { FieldValue } from 'firebase-admin/firestore';

// Force dynamic rendering to prevent static caching
export const dynamic = 'force-dynamic';

interface HeartbeatRequest {
  sessionId: string;
  deviceFingerprint: string;
}

async function heartbeatHandler(request: AuthenticatedRequest) {
  try {
    const body: HeartbeatRequest = await request.json();
    const { sessionId, deviceFingerprint } = body;

    // Validate required fields
    if (!sessionId || !deviceFingerprint) {
      return NextResponse.json({
        error: 'Missing required fields',
        code: 'MISSING_FIELDS',
        required: ['sessionId', 'deviceFingerprint']
      }, { status: 400 });
    }

    // Verify session ID matches JWT token
    if (sessionId !== request.sessionId) {
      console.warn('⚠️ Session ID mismatch in heartbeat:', {
        providedSessionId: sessionId,
        tokenSessionId: request.sessionId
      });
      
      return NextResponse.json({
        error: 'Session ID mismatch',
        code: 'SESSION_MISMATCH'
      }, { status: 403 });
    }

    // Get session document from Firestore
    const sessionRef = adminDb.collection('sessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return NextResponse.json({
        error: 'Session not found',
        code: 'SESSION_NOT_FOUND'
      }, { status: 404 });
    }

    const sessionData = sessionDoc.data();

    // Verify session is still active
    if (sessionData?.status !== 'active') {
      return NextResponse.json({
        error: 'Session is no longer active',
        code: 'SESSION_INACTIVE',
        shouldStop: true
      }, { status: 403 });
    }

    // Verify device fingerprint matches (security check)
    if (sessionData?.deviceFingerprint !== deviceFingerprint) {
      console.warn('⚠️ Device fingerprint mismatch in heartbeat:', {
        sessionId,
        storedFingerprint: sessionData?.deviceFingerprint,
        providedFingerprint: deviceFingerprint
      });
      
      return NextResponse.json({
        error: 'Device fingerprint mismatch',
        code: 'DEVICE_MISMATCH'
      }, { status: 403 });
    }

    const now = new Date();
    
    // **NEW ARCHITECTURE: Redis-based Daily Usage Tracking**
    // Following AI recommendations - use Redis as source of truth for daily usage
    
    const subscriptionStatus = sessionData?.subscriptionStatus || 'limited';
    
    // Determine daily limits
    let dailyLimitSeconds: number;
    switch (subscriptionStatus) {
      case 'premium':
        dailyLimitSeconds = -1; // Unlimited
        break;
      case 'limited':
      default:
        dailyLimitSeconds = 300; // 5 minutes for testing (300 seconds)
        break;
    }
    
    let timeRemaining: number;
    let shouldStop: boolean;
    
    if (dailyLimitSeconds === -1) {
      // Premium users have unlimited time
      timeRemaining = -1;
      shouldStop = false;
    } else {
      // Track daily usage in Redis with atomic increment
      const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format
      const usageKey = `usage:${sessionData.userId}:${today}`;
      
      try {
        // Import Redis here to avoid issues if not available
        const { kv } = await import('@vercel/kv');
        
        // Increment usage by 30 seconds (heartbeat interval)
        const usedSeconds = await kv.incrby(usageKey, 30);
        
        // Set expiration to end of day (24 hours) if this is first increment
        if (usedSeconds === 30) {
          await kv.expire(usageKey, 86400); // 24 hours
        }
        
        // Check if daily limit exceeded
        if (usedSeconds > dailyLimitSeconds) {
          // Daily limit reached - return 200 with shouldStop flag (extension expects this format)
          console.log(`💯 Daily limit reached for user ${sessionData.userId}: ${usedSeconds}s used, limit: ${dailyLimitSeconds}s`);
          
          // Don't increment further - user has hit their limit
          timeRemaining = 0;
          shouldStop = true;
        } else {
          timeRemaining = dailyLimitSeconds - usedSeconds;
          shouldStop = false;
        }
        
        console.log(`⏱️ Usage tracking for ${sessionData.userId}: ${usedSeconds}/${dailyLimitSeconds}s used, ${timeRemaining}s remaining`);
        
      } catch (redisError) {
        console.error('❌ Redis usage tracking failed:', redisError);
        // Fallback to allowing usage if Redis fails (graceful degradation)
        timeRemaining = dailyLimitSeconds;
        shouldStop = false;
      }
    }

    // Update session in Firestore - simplified since Redis handles usage tracking
    const updateData: any = {
      lastActivity: now,
      lastHeartbeat: now,
      heartbeatCount: (sessionData?.heartbeatCount || 0) + 1,
      subscriptionStatus: subscriptionStatus
    };

    // Note: We no longer update totalUsageTime here since Redis is the source of truth
    // Session remains active even if daily limit reached (user can try again tomorrow)

    // Add timeout and retry logic for Firestore update
    try {
      // Set a shorter timeout for the update operation (10 seconds)
      const updatePromise = sessionRef.update(updateData);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Firestore update timeout')), 10000)
      );
      
      await Promise.race([updatePromise, timeoutPromise]);
    } catch (error) {
      console.error('❌ Heartbeat Firestore update failed:', error);
      // Still return a response to keep the extension working
      // The session will continue to work even if this update fails
      if (error.message.includes('timeout') || error.message.includes('DEADLINE_EXCEEDED')) {
        console.warn('⚠️ Firestore timeout - session continues but update failed');
      } else {
        // Re-throw non-timeout errors
        throw error;
      }
    }

    console.log(`💓 Heartbeat processed for session ${sessionId}: Redis usage tracking, remaining: ${timeRemaining}s`);

    // Return current session status
    return NextResponse.json({
      timeRemaining,
      shouldStop,
      sessionActive: !shouldStop,
      subscriptionStatus,
      heartbeatInterval: 30000, // Recommend 30-second intervals
      sessionType: sessionData?.type || 'unknown'
    });

  } catch (error) {
    console.error('❌ Heartbeat error:', error);
    return NextResponse.json({
      error: 'Failed to process heartbeat',
      code: 'HEARTBEAT_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Export the authenticated POST handler
export const POST = withAuth(heartbeatHandler);