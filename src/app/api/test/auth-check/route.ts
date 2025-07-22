/**
 * Simple test endpoint to verify JWT authentication is working
 * This helps diagnose authentication issues
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/auth';

// Protected endpoint - requires authentication
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  return NextResponse.json({
    success: true,
    message: 'Authentication successful!',
    sessionId: request.sessionId,
    userId: request.userId,
    subscriptionStatus: request.subscriptionStatus
  });
});

// Unprotected endpoint - for comparison and Redis testing
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  // Test Redis connection
  let redisTest = null;
  try {
    const { kv } = await import('@vercel/kv');
    const testKey = `debug_test_${Date.now()}`;
    await kv.set(testKey, 'test_value', { ex: 30 });
    const value = await kv.get(testKey);
    await kv.del(testKey);
    redisTest = { success: true, testWorked: value === 'test_value' };
  } catch (error) {
    redisTest = { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown Redis error' 
    };
  }

  // Test environment variables
  const envTest = {
    hasRedisUrl: !!process.env.REDIS_URL,
    hasKvUrl: !!process.env.KV_URL,
    hasJwtSecret: !!process.env.JWT_SECRET,
    nodeEnv: process.env.NODE_ENV
  };
  
  return NextResponse.json({
    success: true,
    message: 'This endpoint does not require authentication',
    hasAuthHeader: !!authHeader,
    authHeaderPreview: authHeader ? authHeader.substring(0, 30) + '...' : null,
    redisTest,
    envTest,
    timestamp: new Date().toISOString(),
    headers: Object.fromEntries(request.headers.entries())
  });
}