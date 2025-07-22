import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Force dynamic rendering to prevent static caching
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { userId, userEmail, deviceFingerprint, forceReset } = await request.json();

    // Require user authentication for daily use activation
    if (!userId || !userEmail) {
      return NextResponse.json({
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED'
      }, { status: 401 });
    }

    if (!deviceFingerprint) {
      return NextResponse.json({
        error: 'Device fingerprint required',
        code: 'DEVICE_FINGERPRINT_REQUIRED'
      }, { status: 400 });
    }

    // Get current date for daily limit tracking
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format

    // DEBUG: Check what daily-limits documents exist
    console.log('🔍 DEBUG: Checking daily-limits collection...');
    
    // Check all daily-limits documents for today to debug conflicts
    const allDailyLimitsQuery = await adminDb.collection('daily-limits').get();
    console.log('📊 DEBUG: All daily-limits documents:');
    allDailyLimitsQuery.docs.forEach(doc => {
      const data = doc.data();
      console.log(`  - Document ID: ${doc.id}`);
      console.log(`  - Date: ${data.date || 'N/A'}`);
      console.log(`  - Activated: ${data.activated || false}`);
      console.log(`  - User: ${data.userId || data.userEmail || 'N/A'}`);
      console.log(`  - Device: ${data.deviceFingerprint || 'N/A'}`);
      console.log('  ---');
    });

    // Check if user already used daily limit today
    const expectedDocId = `${deviceFingerprint}_${todayString}`;
    console.log(`🔍 DEBUG: Looking for document: ${expectedDocId}`);
    console.log(`🔍 DEBUG: Device fingerprint: ${deviceFingerprint}`);
    console.log(`🔍 DEBUG: Today string: ${todayString}`);
    
    const dailyLimitRef = adminDb.collection('daily-limits').doc(expectedDocId);
    const dailyLimitDoc = await dailyLimitRef.get();

    console.log(`🔍 DEBUG: Document exists: ${dailyLimitDoc.exists}`);
    if (dailyLimitDoc.exists) {
      const data = dailyLimitDoc.data();
      console.log(`🔍 DEBUG: Document data:`, data);
      
      if (data?.activated) {
        console.log('❌ DEBUG: Daily limit already activated for this device today');
        
        // TEMPORARY: Allow override for debugging by checking if this is the same user
        
        if (data.userId === userId && data.userEmail === userEmail) {
          console.log('🔄 DEBUG: Same user detected, allowing reset for testing');
          // Delete the existing record to allow re-activation
          await dailyLimitRef.delete();
          console.log('🗑️ DEBUG: Deleted existing daily limit record for re-activation');
        } else {
          return NextResponse.json({
            error: 'Daily limit already used',
            code: 'DAILY_LIMIT_USED',
            message: 'You have already used your daily hour today. Try again tomorrow.',
            nextResetTime: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
            debug: {
              expectedDocId,
              deviceFingerprint,
              todayString,
              existingData: data,
              currentUser: { userId, userEmail },
              existingUser: { userId: data.userId, userEmail: data.userEmail }
            }
          }, { status: 429 });
        }
      }
    }

    // Activate daily use for this device/user combination
    await dailyLimitRef.set({
      deviceFingerprint,
      userId,
      userEmail,
      activatedAt: now,
      date: todayString,
      activated: true,
      usageStartTime: now,
      totalUsageTime: 0,
      dailyLimitMs: 3600000, // 1 hour for production (3600000ms)
      createdAt: now,
      updatedAt: now
    });

    // Update user's subscription status to 'limited' for daily use
    const userRef = adminDb.collection('users').doc(userId);
    await userRef.update({
      subscriptionStatus: 'limited',
      lastDailyActivation: now,
      updatedAt: now
    });

    console.log(`✅ Daily use activated for user ${userId} on device ${deviceFingerprint}`);

    // DEBUG: Also check if this creates the record correctly
    const verifyDoc = await dailyLimitRef.get();
    console.log('🔍 DEBUG: Created document verification:', {
      exists: verifyDoc.exists,
      data: verifyDoc.data()
    });

    return NextResponse.json({
      success: true,
      message: 'Daily use activated successfully',
      dailyLimit: 3600000, // 1 hour for production (3600000ms)
      activatedAt: now.toISOString(),
      expiresAt: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      debug: {
        expectedDocId,
        deviceFingerprint,
        todayString
      }
    });

  } catch (error) {
    console.error('Error activating daily use:', error);
    return NextResponse.json({
      error: 'Failed to activate daily use',
      code: 'ACTIVATION_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}