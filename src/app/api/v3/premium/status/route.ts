/**
 * Premium Users Status API - V3
 * 
 * Single source of truth for premium user status checking
 * Uses consolidated premium status service
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPremiumStatus, formatPremiumStatusResponse } from '@/lib/services/premium-status';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');
    const deviceFingerprint = request.headers.get('X-Device-Fingerprint');

    // Require at least userId or email
    if (!userId && !email) {
      return NextResponse.json({
        error: 'Either userId or email is required',
        code: 'MISSING_IDENTIFIER'
      }, { status: 400 });
    }

    console.log('🔍 Premium status check (GET) for:', { userId, email, deviceFingerprint });

    // Use consolidated premium status service
    const premiumStatus = await getPremiumStatus({ userId, email, deviceFingerprint });

    // Format response using consolidated formatter
    const response = formatPremiumStatusResponse(premiumStatus);

    console.log('✅ Premium status response (GET):', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Premium status check error (GET):', error);
    return NextResponse.json({
      error: 'Failed to check premium status',
      code: 'PREMIUM_STATUS_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email, deviceFingerprint } = body;

    // Same logic as GET but with POST body
    if (!userId && !email) {
      return NextResponse.json({
        error: 'Either userId or email is required',
        code: 'MISSING_IDENTIFIER'
      }, { status: 400 });
    }

    console.log('🔍 Premium status check (POST) for:', { userId, email, deviceFingerprint });

    // Use consolidated premium status service
    const premiumStatus = await getPremiumStatus({ userId, email, deviceFingerprint });

    // Format response using consolidated formatter
    const response = formatPremiumStatusResponse(premiumStatus);

    console.log('✅ Premium status response (POST):', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Premium status check error (POST):', error);
    return NextResponse.json({
      error: 'Failed to check premium status',
      code: 'PREMIUM_STATUS_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

