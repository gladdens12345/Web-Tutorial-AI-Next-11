const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { createHash } = require('crypto');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Constants for security validation
const FREE_TIME_LIMIT_MS = 30 * 60 * 1000; // 30 minutes
const DAILY_LIMIT_MS = 60 * 60 * 1000; // 1 hour

/**
 * Generate a cryptographically secure device fingerprint hash
 */
function hashDeviceFingerprint(fingerprint) {
  const salt = process.env.DEVICE_FINGERPRINT_SALT || 'default_salt_12345';
  return createHash('sha256')
    .update(fingerprint + salt)
    .digest('hex');
}

/**
 * Detect usage anomalies to prevent tampering
 */
function detectAnomalies(session, requestTime) {
  const timeGap = requestTime - session.lastValidated.toMillis();
  
  // Flag suspicious activity
  if (timeGap < 10000) {
    return { anomaly: true, type: 'TOO_FREQUENT' };
  }
  
  if (timeGap > 300000) { // More than 5 minutes gap
    return { anomaly: true, type: 'LARGE_TIME_GAP' };
  }
  
  return { anomaly: false };
}

/**
 * Calculate time remaining based on user type and usage
 */
function calculateTimeRemaining(session) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  switch (session.subscriptionStatus) {
    case 'premium':
      return -1; // Unlimited
      
    case 'trial':
      return -1; // Unlimited during valid trial
      
    case 'limited':
      const todayUsage = session.dailyUsage[today] || 0;
      return Math.max(0, DAILY_LIMIT_MS - todayUsage);
      
    case 'anonymous':
    default:
      return Math.max(0, FREE_TIME_LIMIT_MS - session.timeUsed);
  }
}

/**
 * Main session validation function - called by extension
 */
exports.validateSession = functions.https.onCall(async (data, context) => {
  try {
    console.log('Session validation request:', { 
      sessionId: data.sessionId,
      userId: data.userId,
      timestamp: data.requestTime 
    });

    const { sessionId, userId, deviceFingerprint, requestTime } = data;
    
    if (!sessionId || !deviceFingerprint) {
      throw new functions.https.HttpsError('invalid-argument', 'Session ID and device fingerprint required');
    }

    // Get session from Firestore
    const sessionRef = db.collection('extension_sessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();
    
    if (!sessionDoc.exists) {
      // Create new anonymous session
      const newSession = {
        sessionId,
        userId: userId || undefined,
        deviceFingerprint: hashDeviceFingerprint(deviceFingerprint),
        subscriptionStatus: userId ? 'limited' : 'anonymous',
        createdAt: admin.firestore.Timestamp.fromMillis(requestTime),
        lastValidated: admin.firestore.Timestamp.fromMillis(requestTime),
        timeUsed: 0,
        dailyUsage: {},
        isValid: true
      };
      
      await sessionRef.set(newSession);
      
      const response = {
        isValid: true,
        subscriptionStatus: newSession.subscriptionStatus,
        timeRemaining: userId ? DAILY_LIMIT_MS : FREE_TIME_LIMIT_MS,
        hasKnowledgeBase: false
      };
      
      console.log('New session created:', response);
      return response;
    }

    const session = sessionDoc.data();
    
    // Validate device fingerprint
    const expectedFingerprint = hashDeviceFingerprint(deviceFingerprint);
    if (session.deviceFingerprint !== expectedFingerprint) {
      console.warn('Device fingerprint mismatch:', { 
        sessionId, 
        expected: session.deviceFingerprint,
        received: expectedFingerprint 
      });
      
      await sessionRef.update({ isValid: false });
      
      throw new functions.https.HttpsError('permission-denied', 'Device fingerprint mismatch');
    }

    // Check for anomalies
    const anomaly = detectAnomalies(session, requestTime);
    if (anomaly.anomaly) {
      console.warn('Usage anomaly detected:', { sessionId, anomaly });
      
      await sessionRef.update({ 
        isValid: false,
        anomalyDetected: anomaly.type,
        anomalyTime: admin.firestore.Timestamp.fromMillis(requestTime)
      });
      
      throw new functions.https.HttpsError('permission-denied', `Anomaly detected: ${anomaly.type}`);
    }

    // Update last validation time
    await sessionRef.update({
      lastValidated: admin.firestore.Timestamp.fromMillis(requestTime)
    });

    // Calculate time remaining
    const timeRemaining = calculateTimeRemaining(session);
    const hasKnowledgeBase = ['trial', 'premium'].includes(session.subscriptionStatus);
    
    // Determine if session is still valid
    const isValid = timeRemaining > 0 || timeRemaining === -1; // -1 means unlimited
    
    const response = {
      isValid,
      subscriptionStatus: session.subscriptionStatus,
      timeRemaining,
      hasKnowledgeBase,
      warning: timeRemaining <= 300000 && timeRemaining > 0 ? 'Time running low' : undefined,
      shouldUpgrade: !isValid && session.subscriptionStatus !== 'premium'
    };

    console.log('Session validation result:', response);
    return response;

  } catch (error) {
    console.error('Session validation error:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', 'Session validation failed');
  }
});

/**
 * Track usage time for active sessions
 */
exports.trackUsage = functions.https.onCall(async (data, context) => {
  try {
    const { sessionId, usageTimeMs } = data;
    
    if (!sessionId || usageTimeMs < 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Valid session ID and usage time required');
    }

    const sessionRef = db.collection('extension_sessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();
    
    if (!sessionDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Session not found');
    }

    const session = sessionDoc.data();
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Update usage tracking
    const updatedDailyUsage = { ...session.dailyUsage };
    updatedDailyUsage[today] = (updatedDailyUsage[today] || 0) + usageTimeMs;
    
    await sessionRef.update({
      timeUsed: session.timeUsed + usageTimeMs,
      dailyUsage: updatedDailyUsage,
      lastUsageUpdate: admin.firestore.Timestamp.now()
    });

    const timeRemaining = calculateTimeRemaining({ ...session, dailyUsage: updatedDailyUsage });
    
    return {
      success: true,
      timeRemaining,
      todayUsage: updatedDailyUsage[today]
    };

  } catch (error) {
    console.error('Usage tracking error:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', 'Usage tracking failed');
  }
});

/**
 * Clean up old sessions (runs daily)
 */
exports.cleanupSessions = functions.pubsub.schedule('0 0 * * *').onRun(async (context) => {
  const cutoffTime = admin.firestore.Timestamp.fromMillis(Date.now() - (7 * 24 * 60 * 60 * 1000)); // 7 days ago
  
  const oldSessions = await db.collection('extension_sessions')
    .where('lastValidated', '<', cutoffTime)
    .get();
  
  const batch = db.batch();
  oldSessions.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
  
  console.log(`Cleaned up ${oldSessions.size} old sessions`);
  return null;
});