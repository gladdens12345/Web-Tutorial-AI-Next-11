import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering to prevent static caching
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing Redis connection...');
    
    // Check if environment variables are available
    const envCheck = {
      KV_URL: !!process.env.KV_URL,
      KV_REST_API_URL: !!process.env.KV_REST_API_URL,
      KV_REST_API_TOKEN: !!process.env.KV_REST_API_TOKEN,
      REDIS_URL: !!process.env.REDIS_URL,
      JWT_SECRET: !!process.env.JWT_SECRET
    };

    console.log('📊 Environment variables check:', envCheck);

    // Try to import and use Redis
    let redisTest = null;
    try {
      const { kv } = await import('@vercel/kv');
      
      // Test basic Redis operations
      const testKey = `test_${Date.now()}`;
      const testValue = 'connection_test';
      
      await kv.set(testKey, testValue, { ex: 60 }); // Expire in 60 seconds
      const retrievedValue = await kv.get(testKey);
      await kv.del(testKey); // Cleanup
      
      redisTest = {
        success: true,
        testKey,
        setValue: testValue,
        retrievedValue,
        match: retrievedValue === testValue
      };
    } catch (redisError) {
      redisTest = {
        success: false,
        error: redisError instanceof Error ? redisError.message : 'Unknown Redis error',
        stack: redisError instanceof Error ? redisError.stack : undefined
      };
    }

    // Test JWT Secret
    let jwtTest = null;
    try {
      const jwt = await import('jsonwebtoken');
      const testPayload = { test: true, timestamp: Date.now() };
      const token = jwt.sign(testPayload, process.env.JWT_SECRET!, { expiresIn: '1h' });
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      
      jwtTest = {
        success: true,
        tokenGenerated: !!token,
        tokenDecoded: !!decoded,
        payloadMatch: typeof decoded === 'object' && decoded !== null && 'test' in decoded
      };
    } catch (jwtError) {
      jwtTest = {
        success: false,
        error: jwtError instanceof Error ? jwtError.message : 'Unknown JWT error'
      };
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      tests: {
        environmentVariables: envCheck,
        redis: redisTest,
        jwt: jwtTest
      }
    });

  } catch (error) {
    console.error('❌ Redis connection test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}