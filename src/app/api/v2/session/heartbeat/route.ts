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
import { getPremiumStatus } from '@/lib/services/premium-status';

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
    
    // 🔧 FIXED: Real-time premium status check to handle upgrades/downgrades during session
    console.log('🔍 Checking real-time premium status for heartbeat...');
    const premiumStatusResult = await getPremiumStatus({
      userId: sessionData.userId,
      email: sessionData.email,
      deviceFingerprint: sessionData.deviceFingerprint
    });
    
    const subscriptionStatus = premiumStatusResult.subscriptionStatus;
    const isUpgrade = sessionData.subscriptionStatus !== subscriptionStatus;
    
    if (isUpgrade) {
      console.log('🎉 Subscription status changed during session:', {
        userId: sessionData.userId,
        previous: sessionData.subscriptionStatus,
        current: subscriptionStatus,
        sessionId: sessionId
      });
      
      // Update session with new premium status
      await sessionRef.update({
        subscriptionStatus: subscriptionStatus,
        premiumStatusUpdated: now,
        'metadata.premiumStatusHistory': FieldValue.arrayUnion({
          from: sessionData.subscriptionStatus,
          to: subscriptionStatus,
          timestamp: now,
          source: 'heartbeat_refresh'
        })
      });
    }
    
    // Determine daily limits
    let dailyLimitMs: number;
    switch (subscriptionStatus) {
      case 'premium':
        dailyLimitMs = -1; // Unlimited
        break;
      case 'limited':
      default:
        dailyLimitMs = 3600000; // 1 hour for production (3600000ms)
        break;
    }
    
    let timeRemaining: number;
    let shouldStop: boolean;
    
    if (dailyLimitMs === -1) {
      // Premium users have unlimited time
      timeRemaining = -1;
      shouldStop = false;
    } else {
      // Track daily usage in Firestore daily-limits collection (same as activation uses)
      const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format
      const expectedDocId = `${sessionData.deviceFingerprint}_${today}`;
      const dailyLimitRef = adminDb.collection('daily-limits').doc(expectedDocId);
      
      try {
        // Use transaction to atomically update usage time
        const usageResult = await adminDb.runTransaction(async (transaction) => {
          const dailyDoc = await transaction.get(dailyLimitRef);
          
          if (!dailyDoc.exists) {
            console.warn(`⚠️ Daily limit document not found: ${expectedDocId} - user may not have activated daily use`);
            // If no daily activation found, deny access
            return {
              totalUsageTime: dailyLimitMs + 1, // Force limit exceeded
              timeRemaining: 0,
              shouldStop: true
            };
          }
          
          const dailyData = dailyDoc.data();
          const currentUsage = dailyData?.totalUsageTime || 0;
          const heartbeatIncrement = 30000; // 30 seconds in milliseconds
          const newTotalUsage = currentUsage + heartbeatIncrement;
          
          // Update usage time
          transaction.update(dailyLimitRef, {
            totalUsageTime: newTotalUsage,
            lastHeartbeat: now,
            updatedAt: now
          });
          
          const timeRemaining = Math.max(0, dailyLimitMs - newTotalUsage);
          const shouldStop = newTotalUsage >= dailyLimitMs;
          
          return {
            totalUsageTime: newTotalUsage,
            timeRemaining,
            shouldStop
          };
        });
        
        timeRemaining = usageResult.timeRemaining;
        shouldStop = usageResult.shouldStop;
        
        if (shouldStop) {
          console.log(`💯 Daily limit reached for user ${sessionData.userId}: ${usageResult.totalUsageTime}ms used, limit: ${dailyLimitMs}ms`);
        } else {
          console.log(`⏱️ Usage tracking for ${sessionData.userId}: ${usageResult.totalUsageTime}/${dailyLimitMs}ms used, ${timeRemaining}ms remaining`);
        }
        
      } catch (firestoreError) {
        console.error('❌ Firestore daily usage tracking failed:', firestoreError);
        // Conservative fallback - deny access if tracking fails
        timeRemaining = 0;
        shouldStop = true;
      }
    }

    // Update session in Firestore - coordinated with daily-limits tracking
    const updateData: any = {
      lastActivity: now,
      lastHeartbeat: now,
      heartbeatCount: (sessionData?.heartbeatCount || 0) + 1,
      subscriptionStatus: subscriptionStatus,
      // Add current time remaining for session tracking
      timeRemaining: timeRemaining
    };

    // If limit reached, mark session as expired
    if (shouldStop) {
      updateData.status = 'expired';
      updateData.endTime = now;
      updateData.endReason = 'daily_limit_reached';
    }

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

    console.log(`💓 Heartbeat processed for session ${sessionId}: Firestore daily-limits tracking, remaining: ${timeRemaining}ms`);

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