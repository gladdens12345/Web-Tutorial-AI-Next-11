/**
 * Premium Status Service - Unified Premium User Validation
 * 
 * Single source of truth for premium status checking across all API endpoints.
 * Consolidates logic from multiple authentication endpoints to eliminate code duplication.
 */

import { adminDb } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { logPremiumStatusCheck, logCriticalConflict } from './premium-status-logger';

export interface PremiumStatusRequest {
  userId?: string;
  email?: string;
  deviceFingerprint?: string;
}

export interface PremiumStatusResult {
  found: boolean;
  userId: string | null;
  email: string | null;
  subscriptionStatus: 'premium' | 'limited' | 'anonymous';
  subscriptionEndDate: Date | null;
  deviceRegistered: boolean;
  source: 'premium_users' | 'custom_claims' | 'customers_collection' | 'users_collection' | 'not_found' | 'error' | 'conflict_resolved';
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStartDate?: Date | null;
  confidence: number; // 0-100, indicates confidence in the result
  conflictDetected?: boolean;
  conflictSources?: string[];
  metadata?: {
    lastAccess?: Date;
    createdAt?: Date;
    updatedAt?: Date;
  };
}

/**
 * Check premium status using consolidated multi-source validation with conflict resolution
 * This replaces all duplicate validation logic across API endpoints
 */
export async function getPremiumStatus(request: PremiumStatusRequest): Promise<PremiumStatusResult> {
  const { userId, email, deviceFingerprint } = request;

  // Require at least userId or email
  if (!userId && !email) {
    return createErrorResult('MISSING_IDENTIFIER', 'Either userId or email is required');
  }

  console.log('🔍 Premium status check for:', { userId, email, deviceFingerprint });

  // Check ALL sources simultaneously for conflict detection
  const sourceResults = await Promise.allSettled([
    checkPremiumUsersCollection({ userId, email, deviceFingerprint }),
    checkCustomClaims({ userId, email }),
    checkStripeExtensionCustomers({ userId, email }),
    checkLegacyUsersCollection({ userId, email })
  ]);

  // Extract successful results
  const validResults = sourceResults
    .filter((result): result is PromiseFulfilledResult<PremiumStatusResult> => 
      result.status === 'fulfilled' && result.value.found
    )
    .map(result => result.value);

  let finalResult: PremiumStatusResult;

  if (validResults.length === 0) {
    // No premium status found anywhere
    console.log('ℹ️ No premium status found in any source, defaulting to limited');
    finalResult = {
      found: false,
      userId: userId || null,
      email: email || null,
      subscriptionStatus: 'limited',
      subscriptionEndDate: null,
      deviceRegistered: false,
      source: 'not_found',
      confidence: 100
    };
  } else if (validResults.length === 1) {
    // Single source found - validate if it's premium status
    const result = validResults[0];
    
    if (result.subscriptionStatus === 'premium') {
      // SECURITY: Validate premium status even from single source
      const isValidPremium = validatePremiumStatus(result);
      
      if (!isValidPremium) {
        console.log('🔒 SECURITY: Invalid premium status from single source, defaulting to limited');
        finalResult = {
          found: false,
          userId: result.userId,
          email: result.email,
          subscriptionStatus: 'limited',
          subscriptionEndDate: null,
          deviceRegistered: false,
          source: 'validated_limited',
          confidence: 95
        };
      } else {
        console.log('✅ Validated premium status from single source:', result.source);
        finalResult = { ...result, confidence: 95 };
      }
    } else {
      // Limited status doesn't need validation
      console.log('✅ Single source limited status found:', result.source);
      finalResult = { ...result, confidence: 95 };
    }
  } else {
    // Multiple sources found - need conflict resolution
    console.log('⚠️ Conflict detected between sources:', validResults.map(r => r.source));
    finalResult = await resolveConflicts(validResults, { userId, email, deviceFingerprint });
  }

  // Log the premium status check for debugging
  await logPremiumStatusCheck({
    timestamp: new Date(),
    userId: finalResult.userId,
    email: finalResult.email,
    deviceFingerprint: deviceFingerprint,
    action: 'status_check',
    subscriptionStatus: finalResult.subscriptionStatus,
    source: finalResult.source,
    confidence: finalResult.confidence,
    conflictDetected: finalResult.conflictDetected,
    conflictSources: finalResult.conflictSources,
    metadata: {
      sourcesChecked: sourceResults.length,
      validSources: validResults.length,
      requestContext: 'getPremiumStatus'
    }
  });

  return finalResult;
}

/**
 * Validate premium status to ensure it's not from test/fake data
 */
function validatePremiumStatus(result: PremiumStatusResult): boolean {
  // Only trust premium status from authoritative sources
  if (result.source === 'premium_users') {
    // Must have valid Stripe customer ID (not test data)
    if (!result.stripeCustomerId) return false;
    if (result.stripeCustomerId.includes('test')) return false;
    if (result.stripeCustomerId.includes('manual')) return false;
    if (result.stripeCustomerId.includes('fake')) return false;
    return true;
  }
  
  if (result.source === 'custom_claims') {
    // Must have valid Stripe subscription ID
    if (!result.stripeSubscriptionId) return false;
    if (result.stripeSubscriptionId.includes('test')) return false;
    if (result.stripeSubscriptionId.includes('manual')) return false;
    if (result.stripeSubscriptionId.includes('fake')) return false;
    return true;
  }
  
  // Don't trust premium status from other sources without validation
  return false;
}

/**
 * Resolve conflicts between multiple data sources
 * Priority order: premium_users > custom_claims > customers_collection > users_collection
 */
async function resolveConflicts(results: PremiumStatusResult[], request: PremiumStatusRequest): Promise<PremiumStatusResult> {
  const { userId, email, deviceFingerprint } = request;
  
  // Define source priority (higher number = higher priority)
  const sourcePriority = {
    'premium_users': 100,
    'custom_claims': 80,
    'customers_collection': 60,
    'users_collection': 40
  };

  // Check for subscription status conflicts
  const premiumResults = results.filter(r => r.subscriptionStatus === 'premium');
  const limitedResults = results.filter(r => r.subscriptionStatus === 'limited');
  
  if (premiumResults.length > 0 && limitedResults.length > 0) {
    // SECURITY: Conflict between premium and limited status - use secure resolution
    console.log('🚨 CRITICAL: Premium/Limited conflict detected:', {
      userId,
      email,
      premiumSources: premiumResults.map(r => r.source),
      limitedSources: limitedResults.map(r => r.source)
    });
    
    // SECURITY FIX: Validate premium claims before accepting them
    const validPremiumResults = premiumResults.filter(result => validatePremiumStatus(result));
    
    if (validPremiumResults.length === 0) {
      // No valid premium status found - default to limited for security
      const bestLimitedResult = limitedResults.reduce((best, current) => {
        const currentPriority = sourcePriority[current.source as keyof typeof sourcePriority] || 0;
        const bestPriority = sourcePriority[best.source as keyof typeof sourcePriority] || 0;
        return currentPriority > bestPriority ? current : best;
      });

      console.log('🔒 SECURITY: No valid premium claims found, defaulting to limited');
      
      await logCriticalConflict({
        userId: userId || 'unknown',
        email: email || 'unknown',
        conflictingSources: results.map(r => ({
          source: r.source,
          subscriptionStatus: r.subscriptionStatus,
          timestamp: new Date()
        })),
        resolution: {
          chosenStatus: 'limited',
          chosenSource: bestLimitedResult.source,
          reason: 'Security: Invalid premium claims detected, defaulting to limited'
        },
        context: {
          deviceFingerprint,
          endpoint: 'getPremiumStatus'
        }
      });
      
      return {
        ...bestLimitedResult,
        confidence: 90, // High confidence in security decision
        conflictDetected: true,
        conflictSources: results.map(r => r.source),
        source: 'conflict_resolved'
      };
    }
    
    // Valid premium status found - use highest priority valid result
    const bestValidPremiumResult = validPremiumResults.reduce((best, current) => {
      const currentPriority = sourcePriority[current.source as keyof typeof sourcePriority] || 0;
      const bestPriority = sourcePriority[best.source as keyof typeof sourcePriority] || 0;
      return currentPriority > bestPriority ? current : best;
    });
    
    console.log('✅ Valid premium status found from:', bestValidPremiumResult.source);
    
    await logCriticalConflict({
      userId: userId || 'unknown',
      email: email || 'unknown',
      conflictingSources: results.map(r => ({
        source: r.source,
        subscriptionStatus: r.subscriptionStatus,
        timestamp: new Date()
      })),
      resolution: {
        chosenStatus: bestValidPremiumResult.subscriptionStatus,
        chosenSource: bestValidPremiumResult.source,
        reason: 'Valid premium status verified with Stripe data'
      },
      context: {
        deviceFingerprint,
        endpoint: 'getPremiumStatus'
      }
    });
    
    return {
      ...bestValidPremiumResult,
      confidence: 85, // Good confidence in validated premium status
      conflictDetected: true,
      conflictSources: results.map(r => r.source),
      source: 'conflict_resolved'
    };
  }
  
  // No premium/limited conflict - choose highest priority source
  const bestResult = results.reduce((best, current) => {
    const currentPriority = sourcePriority[current.source as keyof typeof sourcePriority] || 0;
    const bestPriority = sourcePriority[best.source as keyof typeof sourcePriority] || 0;
    return currentPriority > bestPriority ? current : best;
  });
  
  console.log('✅ Multiple sources agree - using highest priority:', bestResult.source);
  
  return {
    ...bestResult,
    confidence: 85, // High confidence when sources agree
    conflictDetected: false,
    conflictSources: results.map(r => r.source)
  };
}

/**
 * Check premium_users collection (primary source)
 */
async function checkPremiumUsersCollection({ userId, email, deviceFingerprint }: PremiumStatusRequest): Promise<PremiumStatusResult> {
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
      const data = premiumUserDoc.data();
      
      // Update last access time
      await premiumUserDoc.ref.update({
        'metadata.lastAccess': new Date(),
        'metadata.updatedAt': new Date()
      });

      // Check if device is registered
      const deviceRegistered = deviceFingerprint ? 
        !!data.deviceFingerprints?.[deviceFingerprint] : false;

      return {
        found: true,
        userId: data.userId,
        email: data.email,
        subscriptionStatus: data.subscriptionStatus || 'limited',
        subscriptionEndDate: data.subscriptionEndDate ? new Date(data.subscriptionEndDate) : null,
        subscriptionStartDate: data.subscriptionStartDate ? new Date(data.subscriptionStartDate) : null,
        stripeCustomerId: data.stripeCustomerId,
        stripeSubscriptionId: data.stripeSubscriptionId,
        deviceRegistered,
        source: 'premium_users',
        metadata: {
          lastAccess: new Date(),
          createdAt: data.metadata?.createdAt,
          updatedAt: new Date()
        }
      };
    }

    return createNotFoundResult(userId, email);

  } catch (error) {
    console.error('Error checking premium_users collection:', error);
    return createErrorResult('PREMIUM_USERS_ERROR', error);
  }
}

/**
 * Check fallback sources for backward compatibility
 */
async function checkFallbackSources({ userId, email }: PremiumStatusRequest): Promise<PremiumStatusResult> {
  // 1. Check Firebase custom claims (primary fallback)
  if (userId) {
    const customClaimsResult = await checkFirebaseCustomClaims(userId, email);
    if (customClaimsResult.found) return customClaimsResult;
  }

  // 2. Check Firebase Stripe Extension customers collection
  if (userId) {
    const customersResult = await checkCustomersCollection(userId, email);
    if (customersResult.found) return customersResult;
  }

  // 3. Check legacy users collection
  if (userId) {
    const usersResult = await checkLegacyUsersCollection(userId, email);
    if (usersResult.found) return usersResult;
  }

  // 4. Email lookup in users collection (last resort)
  if (email) {
    const emailResult = await checkUsersByEmail(email);
    if (emailResult.found) return emailResult;
  }

  return createNotFoundResult(userId, email);
}

/**
 * Check Firebase custom claims
 */
async function checkFirebaseCustomClaims(userId: string, email?: string): Promise<PremiumStatusResult> {
  try {
    const auth = getAuth();
    const userRecord = await auth.getUser(userId);
    const customClaims = userRecord.customClaims || {};
    
    if (customClaims.stripeRole === 'premium' || customClaims.premium === true || customClaims.subscriptionStatus === 'premium') {
      return {
        found: true,
        userId: userId,
        email: userRecord.email || email || '',
        subscriptionStatus: 'premium',
        subscriptionEndDate: customClaims.subscriptionEndDate ? new Date(customClaims.subscriptionEndDate * 1000) : null,
        subscriptionStartDate: customClaims.subscriptionStartDate ? new Date(customClaims.subscriptionStartDate * 1000) : null,
        stripeCustomerId: customClaims.stripeCustomerId,
        stripeSubscriptionId: customClaims.stripeSubscriptionId,
        deviceRegistered: false,
        source: 'custom_claims'
      };
    }

    return createNotFoundResult(userId, email);
  } catch (error) {
    console.warn('Failed to check custom claims:', error);
    return createNotFoundResult(userId, email);
  }
}

/**
 * Check Firebase Stripe Extension customers collection
 */
async function checkCustomersCollection(userId: string, email?: string): Promise<PremiumStatusResult> {
  try {
    const subscriptionsSnapshot = await adminDb
      .collection('customers')
      .doc(userId)
      .collection('subscriptions')
      .where('status', 'in', ['active', 'trialing'])
      .get();
    
    if (!subscriptionsSnapshot.empty) {
      return {
        found: true,
        userId: userId,
        email: email || '',
        subscriptionStatus: 'premium',
        subscriptionEndDate: null,
        deviceRegistered: false,
        source: 'customers_collection'
      };
    }

    return createNotFoundResult(userId, email);
  } catch (error) {
    console.warn('Failed to check customers collection:', error);
    return createNotFoundResult(userId, email);
  }
}

/**
 * Check legacy users collection by userId
 */
async function checkLegacyUsersCollection(userId: string, email?: string): Promise<PremiumStatusResult> {
  try {
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      if (userData?.subscriptionStatus === 'premium') {
        return {
          found: true,
          userId: userId,
          email: userData.email || email || '',
          subscriptionStatus: 'premium',
          subscriptionEndDate: userData.subscriptionEndDate ? new Date(userData.subscriptionEndDate) : null,
          deviceRegistered: false,
          source: 'users_collection'
        };
      }
    }

    return createNotFoundResult(userId, email);
  } catch (error) {
    console.warn('Failed to check users collection:', error);
    return createNotFoundResult(userId, email);
  }
}

/**
 * Check legacy users collection by email
 */
async function checkUsersByEmail(email: string): Promise<PremiumStatusResult> {
  try {
    const querySnapshot = await adminDb.collection('users').where('email', '==', email).limit(1).get();
    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data();
      if (userData?.subscriptionStatus === 'premium') {
        return {
          found: true,
          userId: userData.userId || null,
          email: email,
          subscriptionStatus: 'premium',
          subscriptionEndDate: userData.subscriptionEndDate ? new Date(userData.subscriptionEndDate) : null,
          deviceRegistered: false,
          source: 'users_collection'
        };
      }
    }

    return createNotFoundResult(null, email);
  } catch (error) {
    console.warn('Failed to lookup user by email:', error);
    return createNotFoundResult(null, email);
  }
}

/**
 * Helper function to create not found result
 */
function createNotFoundResult(userId?: string | null, email?: string | null): PremiumStatusResult {
  return {
    found: false,
    userId: userId || null,
    email: email || null,
    subscriptionStatus: 'limited',
    subscriptionEndDate: null,
    deviceRegistered: false,
    source: 'not_found'
  };
}

/**
 * Helper function to create error result
 */
function createErrorResult(code: string, error: any): PremiumStatusResult {
  console.error(`Premium status error [${code}]:`, error);
  return {
    found: false,
    userId: null,
    email: null,
    subscriptionStatus: 'limited',
    subscriptionEndDate: null,
    deviceRegistered: false,
    source: 'error'
  };
}

/**
 * Check Firebase custom claims
 */
async function checkCustomClaims({ userId, email }: PremiumStatusRequest): Promise<PremiumStatusResult> {
  if (!userId) {
    return createNotFoundResult(userId, email);
  }

  try {
    const auth = getAuth();
    const userRecord = await auth.getUser(userId);
    const customClaims = userRecord.customClaims || {};

    if (customClaims.stripeRole === 'premium' || customClaims.premium === true) {
      return {
        found: true,
        userId,
        email: email || userRecord.email || null,
        subscriptionStatus: 'premium',
        subscriptionEndDate: null,
        deviceRegistered: false,
        source: 'custom_claims',
        confidence: 80,
        stripeCustomerId: customClaims.stripeCustomerId || null,
        stripeSubscriptionId: customClaims.stripeSubscriptionId || null
      };
    }

    return createNotFoundResult(userId, email);
  } catch (error) {
    console.warn('Failed to check custom claims:', error);
    return createNotFoundResult(userId, email);
  }
}

/**
 * Check Stripe Extension customers collection
 */
async function checkStripeExtensionCustomers({ userId, email }: PremiumStatusRequest): Promise<PremiumStatusResult> {
  if (!userId) {
    return createNotFoundResult(userId, email);
  }

  try {
    const customerDoc = await adminDb.collection('customers').doc(userId).get();
    
    if (customerDoc.exists) {
      const customerData = customerDoc.data();
      const subscriptionStatus = customerData?.stripeRole === 'premium' ? 'premium' : 'limited';
      
      return {
        found: subscriptionStatus === 'premium',
        userId,
        email: email || customerData?.email || null,
        subscriptionStatus,
        subscriptionEndDate: null,
        deviceRegistered: false,
        source: 'customers_collection',
        confidence: 70,
        stripeCustomerId: customerData?.stripeId || null
      };
    }

    return createNotFoundResult(userId, email);
  } catch (error) {
    console.warn('Failed to check customers collection:', error);
    return createNotFoundResult(userId, email);
  }
}


/**
 * Format premium status result for API responses
 */
export function formatPremiumStatusResponse(result: PremiumStatusResult) {
  const dailyTimeRemaining = result.subscriptionStatus === 'premium' ? -1 : 3600000; // 1 hour for limited users

  return {
    success: true,
    userId: result.userId,
    email: result.email,
    subscriptionStatus: result.subscriptionStatus,
    dailyTimeRemaining,
    deviceRegistered: result.deviceRegistered,
    subscriptionEndDate: result.subscriptionEndDate,
    subscriptionStartDate: result.subscriptionStartDate,
    stripeCustomerId: result.stripeCustomerId,
    stripeSubscriptionId: result.stripeSubscriptionId,
    features: {
      unlimitedTime: result.subscriptionStatus === 'premium',
      knowledgeBase: result.subscriptionStatus === 'premium',
      priority: result.subscriptionStatus === 'premium'
    },
    source: result.source,
    metadata: result.metadata
  };
}

/**
 * Legacy support for auth-status endpoint response format
 */
export function formatAuthStatusResponse(result: PremiumStatusResult) {
  const subscriptionStatus = result.subscriptionStatus;

  // Convert any legacy trial status to limited
  if (subscriptionStatus === 'trial' || (!result.found && subscriptionStatus === 'limited')) {
    return {
      subscriptionStatus: 'limited',
      canUse: true,
      reason: 'limited_daily_access',
      timeRemaining: 3600000, // 1 hour
      hasKnowledgeBase: false,
      requiresSubscription: false
    };
  }

  // Premium users
  if (subscriptionStatus === 'premium') {
    return {
      subscriptionStatus: 'premium',
      canUse: true,
      reason: 'premium_unlimited',
      timeRemaining: -1, // Unlimited
      hasKnowledgeBase: true,
      subscriptionEndDate: result.subscriptionEndDate
    };
  }

  // Default: Limited users
  return {
    subscriptionStatus: 'limited',
    canUse: true,
    reason: 'limited_daily_access',
    timeRemaining: 3600000, // 1 hour
    hasKnowledgeBase: false,
    requiresSubscription: false
  };
}