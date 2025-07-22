import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';

// Force dynamic rendering to prevent static caching
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Safely parse JSON with validation
    let requestBody;
    try {
      const requestText = await request.text();
      console.log('🔍 Auth-status request body:', requestText);
      
      if (!requestText || requestText.trim() === '') {
        console.log('⚠️ Empty request body received');
        requestBody = {};
      } else {
        requestBody = JSON.parse(requestText);
      }
    } catch (parseError) {
      console.error('❌ JSON parsing error:', parseError, 'Raw body:', await request.text());
      return NextResponse.json(
        { 
          error: 'Invalid JSON in request body',
          subscriptionStatus: 'error',
          canUse: false,
          reason: 'invalid_request',
          timeRemaining: 0,
          hasKnowledgeBase: false
        },
        { status: 400 }
      );
    }
    
    const { userEmail, userId } = requestBody;

    if (!userEmail && !userId) {
      return NextResponse.json({ 
        error: 'Authentication required',
        subscriptionStatus: 'unauthenticated',
        canUse: false,
        reason: 'authentication_required',
        timeRemaining: 0,
        hasKnowledgeBase: false
      }, { status: 401 });
    }

    let userData;
    let customClaims = null;

    // FIRST: Check Firebase custom claims (primary source of truth)
    if (userId) {
      try {
        const auth = getAuth();
        const userRecord = await auth.getUser(userId);
        customClaims = userRecord.customClaims || {};
        
        // Support both old Stripe claims and new Firebase Extension claims
        if (customClaims.stripeRole === 'premium' || customClaims.premium === true || customClaims.subscriptionStatus === 'premium') {
          console.log('✅ User has premium custom claims (Firebase Extension or legacy Stripe)');
          // If user has premium claims, use those
          userData = {
            subscriptionStatus: 'premium',
            stripeCustomerId: customClaims.stripeCustomerId,
            stripeSubscriptionId: customClaims.stripeSubscriptionId,
            subscriptionStartDate: customClaims.subscriptionStartDate ? new Date(customClaims.subscriptionStartDate * 1000) : null,
            subscriptionEndDate: customClaims.subscriptionEndDate ? new Date(customClaims.subscriptionEndDate * 1000) : null,
            email: userRecord.email || userEmail
          };
        }
      } catch (error) {
        console.warn('Failed to get custom claims:', error);
      }
    }

    // SECOND: Check Firestore if no premium claims found
    if (!userData && userId) {
      try {
        const userDoc = await adminDb.collection('users').doc(userId).get();
        if (userDoc.exists) {
          userData = userDoc.data();
        }
      } catch (error) {
        console.warn('Failed to lookup user by ID:', error);
      }
    }
    
    // THIRD: Fallback to email lookup using Admin SDK
    if (!userData && userEmail) {
      try {
        const querySnapshot = await adminDb.collection('users').where('email', '==', userEmail).limit(1).get();
        if (!querySnapshot.empty) {
          userData = querySnapshot.docs[0].data();
        }
      } catch (error) {
        console.warn('Failed to lookup user by email:', error);
      }
    }
    
    if (!userData) {
      return NextResponse.json({
        subscriptionStatus: 'limited',
        canUse: true,
        reason: 'limited_daily_access',
        timeRemaining: 3600000, // 1 hour for production
        hasKnowledgeBase: false
      });
    }

    return buildResponse(userData);

  } catch (error) {
    console.error('Error checking extension auth status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check authentication status',
        subscriptionStatus: 'error',
        canUse: false,
        reason: 'server_error',
        timeRemaining: 0,
        hasKnowledgeBase: false
      },
      { status: 500 }
    );
  }
}

interface UserData {
  subscriptionStatus?: string;
  subscriptionEndDate?: Date | { toDate: () => Date } | string;
}

function buildResponse(userData: UserData) {
  const subscriptionStatus = userData.subscriptionStatus || 'limited';
  const now = new Date();
  
  console.log('🔍 USER DATA DEBUG:', {
    subscriptionStatus: userData.subscriptionStatus,
    hasEndDate: !!userData.subscriptionEndDate,
    endDate: userData.subscriptionEndDate,
    finalStatus: subscriptionStatus
  });
  
  // Convert any legacy trial status to limited (1 hour daily)
  if (subscriptionStatus === 'trial') {
    console.log('🔍 Converting legacy trial status to limited');
    return NextResponse.json({
      subscriptionStatus: 'limited',
      canUse: true,
      reason: 'trial_expired_limited_access',
      timeRemaining: 3600000, // 1 hour for production
      hasKnowledgeBase: false,
      trialExpired: true,
      requiresSubscription: false
    });
  }

  // Check subscription status and return appropriate limits
  switch (subscriptionStatus) {
    case 'premium':
      return NextResponse.json({
        subscriptionStatus: 'premium',
        canUse: true,
        reason: 'premium_unlimited',
        timeRemaining: -1, // Unlimited
        hasKnowledgeBase: true,
        subscriptionEndDate: userData.subscriptionEndDate
      });
      
    case 'limited':
    default:
      // Limited users get 1 hour daily access
      return NextResponse.json({
        subscriptionStatus: 'limited',
        canUse: true,
        reason: 'limited_daily_access',
        timeRemaining: 3600000, // 1 hour for production
        hasKnowledgeBase: false,
        requiresSubscription: false
      });
  }
}

