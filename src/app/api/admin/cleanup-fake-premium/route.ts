/**
 * ADMIN ENDPOINT: Clean up fake premium data
 * 
 * This endpoint identifies and removes fake premium status granted by test endpoints.
 * It scans for users with test/fake Stripe IDs and resets them to limited status.
 * 
 * SECURITY: Only accessible with proper admin authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { withAdminAuth, AdminAuthenticatedRequest } from '@/lib/middleware/admin-auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface CleanupResult {
  totalScanned: number;
  fakeUsersFound: number;
  premiumUsersFixed: number;
  customClaimsFixed: number;
  usersCollectionFixed: number;
  errors: string[];
}

// POST handler with admin authentication
export const POST = withAdminAuth(async (request: AdminAuthenticatedRequest) => {
  try {

    console.log('🧹 Starting fake premium data cleanup...');
    const result: CleanupResult = {
      totalScanned: 0,
      fakeUsersFound: 0,
      premiumUsersFixed: 0,
      customClaimsFixed: 0,
      usersCollectionFixed: 0,
      errors: []
    };

    // Step 1: Clean premium_users collection
    await cleanPremiumUsersCollection(result);
    
    // Step 2: Clean Firebase custom claims
    await cleanFirebaseCustomClaims(result);
    
    // Step 3: Clean users collection
    await cleanUsersCollection(result);

    console.log('✅ Cleanup completed:', result);

    return NextResponse.json({
      success: true,
      message: 'Fake premium data cleanup completed',
      result: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    return NextResponse.json({
      error: 'Cleanup failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}, 'cleanup');

/**
 * Clean fake premium data from premium_users collection
 */
async function cleanPremiumUsersCollection(result: CleanupResult): Promise<void> {
  console.log('🔍 Scanning premium_users collection...');
  
  try {
    const premiumUsersSnapshot = await adminDb.collection('premium_users').get();
    result.totalScanned += premiumUsersSnapshot.size;

    for (const doc of premiumUsersSnapshot.docs) {
      const data = doc.data();
      const isFake = isFakePremiumData(data.stripeCustomerId, data.stripeSubscriptionId);
      
      if (isFake) {
        result.fakeUsersFound++;
        
        try {
          // Remove the fake premium user record
          await doc.ref.delete();
          result.premiumUsersFixed++;
          
          console.log(`🗑️ Removed fake premium user: ${doc.id} (customer: ${data.stripeCustomerId})`);
        } catch (error) {
          const errorMsg = `Failed to delete premium user ${doc.id}: ${error}`;
          result.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }
    }
  } catch (error) {
    const errorMsg = `Failed to scan premium_users collection: ${error}`;
    result.errors.push(errorMsg);
    console.error(errorMsg);
  }
}

/**
 * Clean fake premium data from Firebase custom claims
 */
async function cleanFirebaseCustomClaims(result: CleanupResult): Promise<void> {
  console.log('🔍 Scanning Firebase custom claims...');
  
  try {
    const auth = getAuth();
    
    // Get all users with premium custom claims
    const listUsersResult = await auth.listUsers();
    
    for (const userRecord of listUsersResult.users) {
      const customClaims = userRecord.customClaims || {};
      
      if (customClaims.premium === true || customClaims.subscriptionStatus === 'premium') {
        const isFake = isFakePremiumData(
          customClaims.stripeCustomerId,
          customClaims.stripeSubscriptionId
        );
        
        if (isFake) {
          try {
            // Remove premium custom claims
            await auth.setCustomUserClaims(userRecord.uid, {
              premium: false,
              subscriptionStatus: 'limited',
              stripeCustomerId: null,
              stripeSubscriptionId: null,
              stripeRole: null
            });
            
            result.customClaimsFixed++;
            console.log(`🔧 Fixed custom claims for user: ${userRecord.uid} (${userRecord.email})`);
          } catch (error) {
            const errorMsg = `Failed to fix custom claims for ${userRecord.uid}: ${error}`;
            result.errors.push(errorMsg);
            console.error(errorMsg);
          }
        }
      }
    }
  } catch (error) {
    const errorMsg = `Failed to scan Firebase custom claims: ${error}`;
    result.errors.push(errorMsg);
    console.error(errorMsg);
  }
}

/**
 * Clean fake premium data from users collection
 */
async function cleanUsersCollection(result: CleanupResult): Promise<void> {
  console.log('🔍 Scanning users collection...');
  
  try {
    const usersSnapshot = await adminDb.collection('users')
      .where('subscriptionStatus', '==', 'premium')
      .get();

    for (const doc of usersSnapshot.docs) {
      const data = doc.data();
      const isFake = isFakePremiumData(data.stripeCustomerId, data.stripeSubscriptionId);
      
      if (isFake) {
        try {
          // Reset to limited status
          await doc.ref.update({
            subscriptionStatus: 'limited',
            stripeCustomerId: null,
            stripeSubscriptionId: null,
            subscriptionStartDate: null,
            subscriptionEndDate: null,
            stripeRole: null,
            updatedAt: new Date()
          });
          
          result.usersCollectionFixed++;
          console.log(`🔧 Fixed users collection for: ${doc.id} (${data.email})`);
        } catch (error) {
          const errorMsg = `Failed to fix users collection for ${doc.id}: ${error}`;
          result.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }
    }
  } catch (error) {
    const errorMsg = `Failed to scan users collection: ${error}`;
    result.errors.push(errorMsg);
    console.error(errorMsg);
  }
}

/**
 * Check if premium data is fake/test data
 */
function isFakePremiumData(stripeCustomerId?: string, stripeSubscriptionId?: string): boolean {
  if (!stripeCustomerId && !stripeSubscriptionId) {
    return false; // No Stripe data, not necessarily fake
  }
  
  const fakePatterns = ['test', 'manual', 'fake', 'debug', 'temp'];
  
  if (stripeCustomerId) {
    for (const pattern of fakePatterns) {
      if (stripeCustomerId.toLowerCase().includes(pattern)) {
        return true;
      }
    }
  }
  
  if (stripeSubscriptionId) {
    for (const pattern of fakePatterns) {
      if (stripeSubscriptionId.toLowerCase().includes(pattern)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * GET endpoint for checking what would be cleaned (dry run)
 */
export const GET = withAdminAuth(async (request: AdminAuthenticatedRequest) => {
  try {

    console.log('🔍 Performing dry run scan for fake premium data...');
    
    const fakeUsers: Array<{
      source: string;
      userId: string;
      email?: string;
      stripeCustomerId?: string;
      stripeSubscriptionId?: string;
    }> = [];

    // Scan premium_users collection
    const premiumUsersSnapshot = await adminDb.collection('premium_users').get();
    for (const doc of premiumUsersSnapshot.docs) {
      const data = doc.data();
      if (isFakePremiumData(data.stripeCustomerId, data.stripeSubscriptionId)) {
        fakeUsers.push({
          source: 'premium_users',
          userId: doc.id,
          email: data.email,
          stripeCustomerId: data.stripeCustomerId,
          stripeSubscriptionId: data.stripeSubscriptionId
        });
      }
    }

    // Scan custom claims
    const auth = getAuth();
    const listUsersResult = await auth.listUsers();
    for (const userRecord of listUsersResult.users) {
      const customClaims = userRecord.customClaims || {};
      if (customClaims.premium === true || customClaims.subscriptionStatus === 'premium') {
        if (isFakePremiumData(customClaims.stripeCustomerId, customClaims.stripeSubscriptionId)) {
          fakeUsers.push({
            source: 'custom_claims',
            userId: userRecord.uid,
            email: userRecord.email,
            stripeCustomerId: customClaims.stripeCustomerId,
            stripeSubscriptionId: customClaims.stripeSubscriptionId
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Dry run completed',
      fakeUsersFound: fakeUsers.length,
      fakeUsers: fakeUsers,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Dry run failed:', error);
    return NextResponse.json({
      error: 'Dry run failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}, 'audit');