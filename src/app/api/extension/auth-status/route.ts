import { NextRequest, NextResponse } from 'next/server';
import { getPremiumStatus, formatAuthStatusResponse } from '@/lib/services/premium-status';

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
      console.error('❌ JSON parsing error:', parseError);
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
    const deviceFingerprint = request.headers.get('X-Device-Fingerprint');

    // 🐛 DEBUG: Log incoming request
    console.log('🐛 DEBUG: Auth-status API called with:', {
      hasUserId: !!userId,
      hasUserEmail: !!userEmail,
      userId: userId,
      userEmail: userEmail,
      deviceFingerprint
    });

    if (!userEmail && !userId) {
      console.log('🐛 DEBUG: Missing auth data, returning unauthenticated');
      return NextResponse.json({ 
        error: 'Authentication required',
        subscriptionStatus: 'unauthenticated',
        canUse: false,
        reason: 'authentication_required',
        timeRemaining: 0,
        hasKnowledgeBase: false
      }, { status: 401 });
    }

    // Use consolidated premium status service
    const premiumStatus = await getPremiumStatus({
      userId,
      email: userEmail,
      deviceFingerprint
    });

    console.log('🐛 DEBUG: Premium status result:', {
      found: premiumStatus.found,
      subscriptionStatus: premiumStatus.subscriptionStatus,
      source: premiumStatus.source,
      userId: premiumStatus.userId,
      email: premiumStatus.email
    });

    // Format response using consolidated formatter
    const response = formatAuthStatusResponse(premiumStatus);
    console.log('🐛 DEBUG: Final API response:', response);
    
    return NextResponse.json(response);

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


