/**
 * Admin Authentication Middleware
 * 
 * Provides authentication for admin endpoints to prevent unauthorized access
 * to sensitive operations like premium status cleanup and monitoring.
 */

import { NextRequest, NextResponse } from 'next/server';

export interface AdminAuthenticatedRequest extends NextRequest {
  adminId: string;
  permissions: string[];
}

export interface AdminAuthResult {
  success: boolean;
  adminId?: string;
  permissions?: string[];
  error?: string;
}

/**
 * Authenticate admin requests using bearer token
 */
export function authenticateAdmin(request: NextRequest): AdminAuthResult {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      success: false,
      error: 'Missing or invalid authorization header'
    };
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix
  
  // Check against admin secrets from environment
  const adminSecrets = {
    ADMIN_CLEANUP_SECRET: {
      permissions: ['cleanup', 'audit'],
      id: 'cleanup-admin'
    },
    ADMIN_MONITORING_SECRET: {
      permissions: ['monitoring', 'logs'],
      id: 'monitoring-admin'
    },
    ADMIN_MASTER_SECRET: {
      permissions: ['cleanup', 'audit', 'monitoring', 'logs', 'users', 'premium'],
      id: 'master-admin'
    }
  };

  for (const [envVar, config] of Object.entries(adminSecrets)) {
    const secret = process.env[envVar];
    if (secret && token === secret) {
      return {
        success: true,
        adminId: config.id,
        permissions: config.permissions
      };
    }
  }

  return {
    success: false,
    error: 'Invalid admin token'
  };
}

/**
 * Check if admin has specific permission
 */
export function hasPermission(permissions: string[], required: string): boolean {
  return permissions.includes(required) || permissions.includes('master');
}

/**
 * Higher-order function to wrap admin endpoints with authentication
 */
export function withAdminAuth(
  handler: (request: AdminAuthenticatedRequest) => Promise<NextResponse>,
  requiredPermission?: string
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Authenticate the request
    const authResult = authenticateAdmin(request);
    
    if (!authResult.success) {
      return NextResponse.json({
        error: 'Unauthorized',
        message: authResult.error
      }, { status: 401 });
    }

    // Check specific permission if required
    if (requiredPermission && !hasPermission(authResult.permissions!, requiredPermission)) {
      return NextResponse.json({
        error: 'Forbidden',
        message: `Required permission: ${requiredPermission}`
      }, { status: 403 });
    }

    // Add admin info to request
    const adminRequest = request as AdminAuthenticatedRequest;
    adminRequest.adminId = authResult.adminId!;
    adminRequest.permissions = authResult.permissions!;

    // Log admin access
    console.log('🔐 Admin access:', {
      adminId: authResult.adminId,
      endpoint: request.url,
      method: request.method,
      permissions: authResult.permissions,
      timestamp: new Date().toISOString()
    });

    return handler(adminRequest);
  };
}

/**
 * Create error response for unauthorized access
 */
export function createUnauthorizedResponse(message?: string): NextResponse {
  return NextResponse.json({
    error: 'Unauthorized',
    message: message || 'Admin authentication required',
    hint: 'Include Authorization: Bearer <admin-token> header'
  }, { status: 401 });
}

/**
 * Create error response for forbidden access
 */
export function createForbiddenResponse(requiredPermission: string): NextResponse {
  return NextResponse.json({
    error: 'Forbidden',
    message: `Insufficient permissions. Required: ${requiredPermission}`,
  }, { status: 403 });
}

/**
 * Validate admin token for specific operation
 */
export async function validateAdminAccess(
  request: NextRequest,
  requiredPermission?: string
): Promise<{ valid: boolean; response?: NextResponse; adminId?: string }> {
  const authResult = authenticateAdmin(request);
  
  if (!authResult.success) {
    return {
      valid: false,
      response: createUnauthorizedResponse(authResult.error)
    };
  }

  if (requiredPermission && !hasPermission(authResult.permissions!, requiredPermission)) {
    return {
      valid: false,
      response: createForbiddenResponse(requiredPermission)
    };
  }

  return {
    valid: true,
    adminId: authResult.adminId
  };
}