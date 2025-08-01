/**
 * ADMIN ENDPOINT: Premium Status Health Monitoring
 * 
 * Provides real-time monitoring of premium status consistency and conflicts.
 * Shows health metrics, recent conflicts, and system status.
 * 
 * SECURITY: Only accessible with proper admin authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AdminAuthenticatedRequest } from '@/lib/middleware/admin-auth';
import { getPremiumStatusHealthStats, getCriticalConflicts } from '@/lib/services/premium-status-logger';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET endpoint for premium status health dashboard
 */
export const GET = withAdminAuth(async (request: AdminAuthenticatedRequest) => {
  try {
    const url = new URL(request.url);
    const hoursParam = url.searchParams.get('hours');
    const hours = hoursParam ? parseInt(hoursParam) : 24;

    console.log('📊 Generating premium status health report...');

    // Get health statistics
    const healthStats = await getPremiumStatusHealthStats(hours);
    
    // Get recent critical conflicts
    const recentConflicts = await getCriticalConflicts(hours);

    // Calculate additional metrics
    const healthScore = calculateHealthScore(healthStats);
    const riskLevel = determineRiskLevel(healthStats);

    const report = {
      timestamp: new Date().toISOString(),
      timeWindow: `${hours} hours`,
      healthScore,
      riskLevel,
      summary: {
        totalPremiumChecks: healthStats.totalChecks,
        conflictsDetected: healthStats.conflictsDetected,
        conflictRate: `${healthStats.conflictRate.toFixed(2)}%`,
        webhookSuccessRate: `${healthStats.webhookSuccessRate.toFixed(2)}%`,
        systemHealth: healthScore >= 90 ? 'GOOD' : healthScore >= 70 ? 'WARNING' : 'CRITICAL'
      },
      metrics: healthStats,
      recentConflicts: recentConflicts.slice(0, 10), // Last 10 conflicts
      recommendations: generateRecommendations(healthStats),
      adminInfo: {
        adminId: request.adminId,
        requestTime: new Date().toISOString()
      }
    };

    return NextResponse.json({
      success: true,
      report
    });

  } catch (error) {
    console.error('❌ Health report generation failed:', error);
    return NextResponse.json({
      error: 'Health report failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}, 'monitoring');

/**
 * Calculate overall health score (0-100)
 */
function calculateHealthScore(stats: any): number {
  let score = 100;
  
  // Deduct points for high conflict rate
  if (stats.conflictRate > 10) score -= 30;
  else if (stats.conflictRate > 5) score -= 20;
  else if (stats.conflictRate > 1) score -= 10;
  
  // Deduct points for low webhook success rate
  if (stats.webhookSuccessRate < 90) score -= 25;
  else if (stats.webhookSuccessRate < 95) score -= 15;
  else if (stats.webhookSuccessRate < 99) score -= 5;
  
  // Deduct points for high absolute conflict count
  if (stats.conflictsDetected > 100) score -= 20;
  else if (stats.conflictsDetected > 50) score -= 10;
  else if (stats.conflictsDetected > 10) score -= 5;
  
  return Math.max(0, score);
}

/**
 * Determine risk level based on metrics
 */
function determineRiskLevel(stats: any): string {
  if (stats.conflictRate > 10 || stats.webhookSuccessRate < 90) {
    return 'HIGH';
  } else if (stats.conflictRate > 5 || stats.webhookSuccessRate < 95) {
    return 'MEDIUM';
  } else if (stats.conflictRate > 1 || stats.webhookSuccessRate < 99) {
    return 'LOW';
  } else {
    return 'MINIMAL';
  }
}

/**
 * Generate recommendations based on health metrics
 */
function generateRecommendations(stats: any): string[] {
  const recommendations: string[] = [];
  
  if (stats.conflictRate > 10) {
    recommendations.push('🚨 URGENT: High conflict rate detected. Run data cleanup immediately.');
  }
  
  if (stats.webhookSuccessRate < 90) {
    recommendations.push('🔧 Check webhook endpoints for errors and missing environment variables.');
  }
  
  if (stats.conflictsDetected > 50) {
    recommendations.push('🧹 Consider running the fake premium data cleanup endpoint.');
  }
  
  if (stats.topConflictSources.length > 0) {
    const topSource = stats.topConflictSources[0];
    recommendations.push(`📊 Most conflicts from "${topSource.source}" source (${topSource.count} conflicts).`);
  }
  
  if (stats.totalChecks === 0) {
    recommendations.push('⚠️ No premium status checks recorded. System may not be functioning.');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('✅ System appears healthy. Continue monitoring.');
  }
  
  return recommendations;
}

/**
 * POST endpoint for manual health check triggers
 */
export const POST = withAdminAuth(async (request: AdminAuthenticatedRequest) => {
  try {
    const { action } = await request.json();
    
    switch (action) {
      case 'clear-logs':
        // This would implement log clearing functionality
        return NextResponse.json({
          success: true,
          message: 'Log clearing not implemented yet',
          adminId: request.adminId
        });
        
      case 'reset-health':
        // This would reset health metrics
        return NextResponse.json({
          success: true,
          message: 'Health reset not implemented yet',
          adminId: request.adminId
        });
        
      default:
        return NextResponse.json({
          error: 'Invalid action',
          validActions: ['clear-logs', 'reset-health']
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error('❌ Health action failed:', error);
    return NextResponse.json({
      error: 'Health action failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}, 'monitoring');