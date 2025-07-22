/**
 * JWT Authentication Middleware for Timer APIs
 * 
 * This middleware secures all timer-related endpoints by requiring valid JWT tokens.
 * It prevents unauthorized access and API abuse while maintaining compatibility
 * with the existing extension architecture.
 */

import type { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { rateLimiter } from '../rate-limiter';

// Define the structure of our JWT payload
interface SessionTokenPayload {
  sessionId: string;
  userId?: string;          // Present for authenticated users
  deviceFingerprint?: string;
  ipAddress: string;
  subscriptionStatus: 'anonymous' | 'limited' | 'premium';
  issuedAt: number;
  expiresAt: number;
}

// Extended request type with session data
export interface AuthenticatedRequest extends NextRequest {
  sessionId: string;
  userId?: string;
  subscriptionStatus: string;
  sessionPayload: SessionTokenPayload;
}

/**
 * Higher-Order Function that wraps API handlers with JWT authentication
 * 
 * @param handler - The API handler function to protect
 * @returns Protected handler that requires valid JWT
 */
export function withAuth<T extends (...args: any[]) => any>(handler: T): T {
  return (async (request: NextRequest, ...args: any[]) => {
    try {
      // 1. Extract JWT token from Authorization header
      const authHeader = request.headers.get('authorization');
      
      // Debug logging to help diagnose the issue
      console.log('🔍 Auth Debug:', {
        hasAuthHeader: !!authHeader,
        authHeaderValue: authHeader?.substring(0, 20) + '...',
        allHeaders: Array.from(request.headers.entries()),
        method: request.method,
        url: request.url
      });
      
      if (!authHeader) {
        return new Response(
          JSON.stringify({ 
            error: 'Authentication required',
            code: 'AUTH_HEADER_MISSING',
            message: 'Authorization header is required for this endpoint'
          }),
          { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // 2. Validate Bearer token format
      const tokenParts = authHeader.split(' ');
      if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid authentication format',
            code: 'AUTH_FORMAT_INVALID',
            message: 'Authorization header must be "Bearer <token>"'
          }),
          { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      const token = tokenParts[1];

      // 3. Verify JWT signature and expiration
      if (!process.env.JWT_SECRET) {
        console.error('CRITICAL: JWT_SECRET environment variable not set');
        return new Response(
          JSON.stringify({ 
            error: 'Server configuration error',
            code: 'SERVER_CONFIG_ERROR'
          }),
          { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      let decoded: SessionTokenPayload;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET) as SessionTokenPayload;
      } catch (jwtError) {
        if (jwtError instanceof jwt.TokenExpiredError) {
          return new Response(
            JSON.stringify({ 
              error: 'Token expired',
              code: 'TOKEN_EXPIRED',
              message: 'Session token has expired. Please restart your session.'
            }),
            { 
              status: 401,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
        
        if (jwtError instanceof jwt.JsonWebTokenError) {
          return new Response(
            JSON.stringify({ 
              error: 'Invalid token',
              code: 'TOKEN_INVALID',
              message: 'Session token is invalid or corrupted.'
            }),
            { 
              status: 401,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }

        throw jwtError; // Re-throw unexpected errors
      }

      // 4. Validate token payload structure
      if (!decoded.sessionId) {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid token payload',
            code: 'TOKEN_PAYLOAD_INVALID',
            message: 'Session token is missing required session identifier.'
          }),
          { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // 5. Apply rate limiting based on the verified sessionId
      const { success, limit, remaining, reset } = await rateLimiter.limit(decoded.sessionId);

      if (!success) {
        return new Response(
          JSON.stringify({ 
            error: 'Too many requests',
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'You have exceeded the rate limit. Please try again later.'
          }),
          { 
            status: 429,
            headers: { 
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': reset.toString()
            }
          }
        );
      }

      // 6. Basic IP validation (optional security layer)
      const currentIP = request.ip || 
                       request.headers.get('x-forwarded-for')?.split(',')[0] || 
                       request.headers.get('x-real-ip') || 
                       'unknown';

      // Note: We allow some IP flexibility for mobile users and corporate NATs
      // Strict IP validation would be done in a more advanced security layer

      // 7. Attach session data to request for use in handler
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.sessionId = decoded.sessionId;
      authenticatedRequest.userId = decoded.userId;
      authenticatedRequest.subscriptionStatus = decoded.subscriptionStatus;
      authenticatedRequest.sessionPayload = decoded;

      // 8. Call the original handler with authenticated request
      const response = await handler(authenticatedRequest, ...args);

      // 9. Add rate limit headers to successful responses
      if (response instanceof Response) {
        const newHeaders = new Headers(response.headers);
        newHeaders.set('X-RateLimit-Limit', limit.toString());
        newHeaders.set('X-RateLimit-Remaining', remaining.toString());
        newHeaders.set('X-RateLimit-Reset', reset.toString());
        
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders
        });
      }

      return response;

    } catch (error) {
      // Log authentication errors for security monitoring
      console.error('Authentication middleware error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ip: request.ip || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        url: request.url,
        timestamp: new Date().toISOString()
      });

      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed',
          code: 'AUTH_ERROR',
          message: 'An error occurred during authentication.'
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }) as T;
}

/**
 * Utility function to generate session JWTs
 * Used by session creation endpoints
 */
export function generateSessionJWT(
  payload: Omit<SessionTokenPayload, 'issuedAt' | 'expiresAt'>, 
  expiresInMs?: number
): string {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  const now = Math.floor(Date.now() / 1000);
  // Use provided expiration time or default to 2 minutes for testing
  const expiresIn = expiresInMs ? Math.floor(expiresInMs / 1000) : 120;

  const fullPayload: SessionTokenPayload = {
    ...payload,
    issuedAt: now,
    expiresAt: now + expiresIn
  };

  return jwt.sign(fullPayload, process.env.JWT_SECRET, {
    expiresIn: expiresIn,
    issuer: 'webtutorialai.com',
    audience: 'extension'
  });
}

/**
 * Utility function to validate session tokens without middleware
 * Useful for one-off validations
 */
export function validateSessionToken(token: string): SessionTokenPayload | null {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as SessionTokenPayload;
    
    if (!decoded.sessionId) {
      return null;
    }

    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Rate limiting aware authentication wrapper
 * Includes additional security measures for high-frequency endpoints
 * Note: Rate limiting is now automatically applied in the withAuth function
 * This wrapper is kept for backward compatibility and future custom rate limits
 */
export function withAuthAndRateLimit<T extends (...args: any[]) => any>(
  handler: T,
  rateLimitConfig?: {
    windowMs: number;
    maxRequests: number;
  }
): T {
  // Rate limiting is now integrated into withAuth
  // Custom rate limit configurations can be added here in the future
  return withAuth(handler);
}