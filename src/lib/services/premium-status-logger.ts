/**
 * Premium Status Logging Service
 * 
 * Comprehensive logging for premium status changes, conflicts, and session creation
 * to help debug the premium/free status inconsistencies
 */

import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface PremiumStatusLogEntry {
  timestamp: Date;
  userId: string | null;
  email: string | null;
  deviceFingerprint?: string;
  sessionId?: string;
  action: 'status_check' | 'session_create' | 'heartbeat_refresh' | 'webhook_process' | 'conflict_detected';
  subscriptionStatus: 'premium' | 'limited' | 'anonymous';
  source: string;
  confidence?: number;
  conflictDetected?: boolean;
  conflictSources?: string[];
  metadata: Record<string, any>;
}

export interface SessionStatusLogEntry {
  timestamp: Date;
  sessionId: string;
  userId: string;
  email: string;
  action: 'session_created' | 'status_upgraded' | 'status_downgraded' | 'session_ended';
  previousStatus?: string;
  newStatus: string;
  source: string;
  metadata: Record<string, any>;
}

/**
 * Log premium status check results
 */
export async function logPremiumStatusCheck(entry: PremiumStatusLogEntry): Promise<void> {
  try {
    const logEntry = {
      ...entry,
      timestamp: FieldValue.serverTimestamp(),
      logType: 'premium_status_check',
      version: 1
    };

    // Store in premium_status_logs collection
    await adminDb.collection('premium_status_logs').add(logEntry);

    // Also add to console for immediate debugging
    console.log('📊 Premium Status Log:', {
      action: entry.action,
      userId: entry.userId,
      email: entry.email,
      subscriptionStatus: entry.subscriptionStatus,
      source: entry.source,
      conflictDetected: entry.conflictDetected,
      confidence: entry.confidence
    });

  } catch (error) {
    console.error('Failed to log premium status check:', error);
  }
}

/**
 * Log session status changes
 */
export async function logSessionStatusChange(entry: SessionStatusLogEntry): Promise<void> {
  try {
    const logEntry = {
      ...entry,
      timestamp: FieldValue.serverTimestamp(),
      logType: 'session_status_change',
      version: 1
    };

    // Store in session_status_logs collection
    await adminDb.collection('session_status_logs').add(logEntry);

    // Also add to console for immediate debugging
    console.log('🔄 Session Status Log:', {
      action: entry.action,
      sessionId: entry.sessionId,
      userId: entry.userId,
      email: entry.email,
      previousStatus: entry.previousStatus,
      newStatus: entry.newStatus,
      source: entry.source
    });

  } catch (error) {
    console.error('Failed to log session status change:', error);
  }
}

/**
 * Log critical premium/free conflicts for investigation
 */
export async function logCriticalConflict(data: {
  userId: string;
  email: string;
  conflictingSources: Array<{
    source: string;
    subscriptionStatus: string;
    timestamp: Date;
  }>;
  resolution: {
    chosenStatus: string;
    chosenSource: string;
    reason: string;
  };
  context: {
    sessionId?: string;
    deviceFingerprint?: string;
    endpoint: string;
  };
}): Promise<void> {
  try {
    const logEntry = {
      ...data,
      timestamp: FieldValue.serverTimestamp(),
      logType: 'critical_conflict',
      severity: 'HIGH',
      requiresInvestigation: true,
      version: 1
    };

    // Store in critical_conflicts collection for urgent attention
    await adminDb.collection('critical_conflicts').add(logEntry);

    // Enhanced console logging for immediate attention
    console.error('🚨 CRITICAL CONFLICT DETECTED:', {
      userId: data.userId,
      email: data.email,
      endpoint: data.context.endpoint,
      conflictingSources: data.conflictingSources.map(s => `${s.source}:${s.subscriptionStatus}`),
      resolution: `${data.resolution.chosenStatus} from ${data.resolution.chosenSource}`,
      reason: data.resolution.reason
    });

  } catch (error) {
    console.error('Failed to log critical conflict:', error);
  }
}

/**
 * Log webhook processing results
 */
export async function logWebhookProcessing(data: {
  webhookId: string;
  webhookType: string;
  userId?: string;
  email?: string;
  success: boolean;
  subscriptionStatus?: string;
  errorMessage?: string;
  processingTimeMs: number;
  stripeData: Record<string, any>;
}): Promise<void> {
  try {
    const logEntry = {
      ...data,
      timestamp: FieldValue.serverTimestamp(),
      logType: 'webhook_processing',
      version: 1
    };

    // Store in webhook_processing_logs collection
    await adminDb.collection('webhook_processing_logs').add(logEntry);

    // Console logging based on success/failure
    if (data.success) {
      console.log('✅ Webhook Processing Success:', {
        type: data.webhookType,
        userId: data.userId,
        email: data.email,
        subscriptionStatus: data.subscriptionStatus,
        processingTime: `${data.processingTimeMs}ms`
      });
    } else {
      console.error('❌ Webhook Processing Failed:', {
        type: data.webhookType,
        userId: data.userId,
        email: data.email,
        error: data.errorMessage,
        processingTime: `${data.processingTimeMs}ms`
      });
    }

  } catch (error) {
    console.error('Failed to log webhook processing:', error);
  }
}

/**
 * Query recent logs for debugging
 */
export async function getRecentPremiumStatusLogs(userId: string, hours: number = 24): Promise<any[]> {
  try {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);

    const query = await adminDb
      .collection('premium_status_logs')
      .where('userId', '==', userId)
      .where('timestamp', '>=', cutoffTime)
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();

    return query.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

  } catch (error) {
    console.error('Failed to get recent premium status logs:', error);
    return [];
  }
}

/**
 * Get critical conflicts for investigation
 */
export async function getCriticalConflicts(hours: number = 24): Promise<any[]> {
  try {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);

    const query = await adminDb
      .collection('critical_conflicts')
      .where('timestamp', '>=', cutoffTime)
      .where('requiresInvestigation', '==', true)
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();

    return query.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

  } catch (error) {
    console.error('Failed to get critical conflicts:', error);
    return [];
  }
}

/**
 * Health check - get stats on premium status consistency
 */
export async function getPremiumStatusHealthStats(hours: number = 24): Promise<{
  totalChecks: number;
  conflictsDetected: number;
  conflictRate: number;
  topConflictSources: Array<{ source: string; count: number }>;
  webhookSuccessRate: number;
}> {
  try {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);

    // Get all premium status checks
    const statusChecks = await adminDb
      .collection('premium_status_logs')
      .where('timestamp', '>=', cutoffTime)
      .get();

    // Get conflicts
    const conflicts = await adminDb
      .collection('critical_conflicts')
      .where('timestamp', '>=', cutoffTime)
      .get();

    // Get webhook processing stats
    const webhooks = await adminDb
      .collection('webhook_processing_logs')
      .where('timestamp', '>=', cutoffTime)
      .get();

    const totalChecks = statusChecks.size;
    const conflictsDetected = conflicts.size;
    const conflictRate = totalChecks > 0 ? (conflictsDetected / totalChecks) * 100 : 0;

    // Analyze conflict sources
    const sourceConflicts = new Map<string, number>();
    conflicts.docs.forEach(doc => {
      const data = doc.data();
      data.conflictingSources?.forEach((source: any) => {
        const key = source.source;
        sourceConflicts.set(key, (sourceConflicts.get(key) || 0) + 1);
      });
    });

    const topConflictSources = Array.from(sourceConflicts.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Webhook success rate
    const successfulWebhooks = webhooks.docs.filter(doc => doc.data().success).length;
    const webhookSuccessRate = webhooks.size > 0 ? (successfulWebhooks / webhooks.size) * 100 : 100;

    return {
      totalChecks,
      conflictsDetected,
      conflictRate,
      topConflictSources,
      webhookSuccessRate
    };

  } catch (error) {
    console.error('Failed to get premium status health stats:', error);
    return {
      totalChecks: 0,
      conflictsDetected: 0,
      conflictRate: 0,
      topConflictSources: [],
      webhookSuccessRate: 0
    };
  }
}