import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Running session cleanup...');

    const now = new Date();
    
    // Clean up sessions that haven't had a heartbeat in over 1 hour
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    // Find stale active sessions
    const staleSessionsQuery = await adminDb.collection('sessions')
      .where('status', '==', 'active')
      .where('lastHeartbeat', '<', oneHourAgo)
      .get();

    let closedSessions = 0;
    const batch = adminDb.batch();

    // Close stale sessions and calculate their usage
    for (const sessionDoc of staleSessionsQuery.docs) {
      const sessionData = sessionDoc.data();
      const startTime = sessionData.startTime.toDate();
      const lastHeartbeat = sessionData.lastHeartbeat.toDate();
      
      // Calculate usage time based on last heartbeat
      const usageTime = lastHeartbeat.getTime() - startTime.getTime();
      
      // Update session to completed with calculated usage
      batch.update(sessionDoc.ref, {
        endTime: lastHeartbeat,
        usageTime: usageTime,
        status: 'timeout',
        closedAt: now,
        closedReason: 'session_timeout'
      });

      // Track the usage in user's daily total if it's a significant amount (> 30 seconds)
      if (usageTime > 30000) {
        try {
          const userDocRef = adminDb.collection('users').doc(sessionData.userId);
          const userDoc = await userDocRef.get();
          
          if (userDoc.exists) {
            const userData = userDoc.data();
            const today = lastHeartbeat.toISOString().split('T')[0];
            const dailyUsage = userData?.dailyUsage || {};
            dailyUsage[today] = (dailyUsage[today] || 0) + usageTime;
            
            // Update user's daily usage
            batch.update(userDocRef, {
              dailyUsage: dailyUsage,
              lastUsageUpdate: now,
              totalSessionTime: (userData?.totalSessionTime || 0) + usageTime
            });
          }
        } catch (userUpdateError) {
          console.error('Error updating user usage for session:', sessionDoc.id, userUpdateError);
        }
      }
      
      closedSessions++;
    }

    // Commit session updates
    if (closedSessions > 0) {
      await batch.commit();
      console.log(`Closed ${closedSessions} stale sessions`);
    }

    // Clean up old completed sessions (older than 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const oldSessionsQuery = await adminDb.collection('sessions')
      .where('endTime', '<', sevenDaysAgo)
      .where('status', 'in', ['completed', 'timeout'])
      .limit(100) // Process in batches to avoid timeouts
      .get();

    let deletedSessions = 0;
    const deleteBatch = adminDb.batch();

    oldSessionsQuery.docs.forEach((doc) => {
      deleteBatch.delete(doc.ref);
      deletedSessions++;
    });

    if (deletedSessions > 0) {
      await deleteBatch.commit();
      console.log(`Deleted ${deletedSessions} old sessions`);
    }

    // Clean up old daily usage data (older than 60 days) from user documents
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const cutoffDate = sixtyDaysAgo.toISOString().split('T')[0];
    
    const usersRef = adminDb.collection('users');
    const usersWithOldData = await usersRef
      .where('lastUsageUpdate', '<', sixtyDaysAgo)
      .limit(50) // Process in small batches
      .get();

    let cleanedUsers = 0;
    const userCleanupBatch = adminDb.batch();

    usersWithOldData.docs.forEach((userDoc) => {
      const userData = userDoc.data();
      const dailyUsage = userData?.dailyUsage || {};
      
      // Remove old daily usage entries
      const cleanedDailyUsage = Object.fromEntries(
        Object.entries(dailyUsage).filter(([date]) => date >= cutoffDate)
      );
      
      if (Object.keys(cleanedDailyUsage).length !== Object.keys(dailyUsage).length) {
        userCleanupBatch.update(userDoc.ref, {
          dailyUsage: cleanedDailyUsage,
          lastCleanup: now
        });
        cleanedUsers++;
      }
    });

    if (cleanedUsers > 0) {
      await userCleanupBatch.commit();
      console.log(`Cleaned up old usage data for ${cleanedUsers} users`);
    }

    return NextResponse.json({ 
      success: true, 
      closedSessions,
      deletedSessions,
      cleanedUsers,
      timestamp: now.toISOString(),
      nextCleanup: 'In 6 hours'
    });
    
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
    
    const errorDetails = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : { message: 'Unknown error' };
    
    console.error('Error details:', errorDetails);
    
    return NextResponse.json(
      { error: `Failed to cleanup sessions: ${errorDetails.message}` },
      { status: 500 }
    );
  }
}

// Also allow POST method for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}