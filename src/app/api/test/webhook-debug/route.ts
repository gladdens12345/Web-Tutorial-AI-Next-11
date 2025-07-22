import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ error: 'userId parameter required' }, { status: 400 });
  }

  try {
    // Simulate what the webhook should do
    const { adminDb } = await import('@/lib/firebase-admin');
    
    console.log('🧪 Manual webhook test for user:', userId);
    
    await adminDb.collection('users').doc(userId).update({
      subscriptionStatus: 'premium',
      stripeCustomerId: 'test_customer',
      stripeSubscriptionId: 'test_subscription', 
      subscriptionStartDate: new Date(),
      subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      updatedAt: new Date(),
    });

    console.log('✅ Manual webhook test completed for user:', userId);

    return NextResponse.json({
      success: true,
      message: `User ${userId} manually updated to premium`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Manual webhook test failed:', error);
    return NextResponse.json({
      error: 'Webhook test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}