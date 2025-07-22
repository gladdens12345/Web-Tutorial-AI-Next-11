/**
 * TEST ENDPOINT - Generate JWT tokens for testing authentication
 * 
 * WARNING: This endpoint should be REMOVED in production!
 * It's only for testing the JWT authentication implementation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateSessionJWT } from '@/lib/middleware/auth';

export async function POST(request: NextRequest) {
  try {
    // WARNING: In production, this would require proper authentication
    const { userId, email, subscriptionStatus = 'limited' } = await request.json();

    if (!userId) {
      return NextResponse.json({ 
        error: 'userId is required' 
      }, { status: 400 });
    }

    // Generate a test JWT token
    const token = generateSessionJWT({
      sessionId: `test_session_${Date.now()}`,
      userId: userId,
      deviceFingerprint: 'test_device_fingerprint',
      ipAddress: request.ip || '127.0.0.1',
      subscriptionStatus: subscriptionStatus as any
    });

    return NextResponse.json({
      success: true,
      token: token,
      expiresIn: '1 hour',
      usage: 'Add this token to your API requests as: authorization: Bearer <token>',
      warning: 'This is a TEST endpoint - remove in production!',
      testRequests: {
        checkLimit: `curl -X POST http://localhost:3000/api/daily-limit/check-limit \\
  -H "Content-Type: application/json" \\
  -H "authorization: Bearer ${token}" \\
  -d '{"extensionId": "test_extension", "userIP": "127.0.0.1"}'`,
        trackUsage: `curl -X POST http://localhost:3000/api/extension/track-usage \\
  -H "Content-Type: application/json" \\
  -H "authorization: Bearer ${token}" \\
  -d '{"userEmail": "${email || 'test@example.com'}", "usageTimeMs": 60000}'`
      }
    });

  } catch (error) {
    console.error('Error generating test JWT:', error);
    return NextResponse.json(
      { error: 'Failed to generate test JWT' },
      { status: 500 }
    );
  }
}