import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 DEBUG: Cleaning up daily-limits collection...');

    // Get all daily-limits documents
    const allDailyLimitsQuery = await adminDb.collection('daily-limits').get();
    
    console.log(`📊 DEBUG: Found ${allDailyLimitsQuery.docs.length} daily-limits documents`);
    
    // Delete all documents
    const batch = adminDb.batch();
    
    allDailyLimitsQuery.docs.forEach(doc => {
      console.log(`🗑️ DEBUG: Queuing deletion of document: ${doc.id}`);
      batch.delete(doc.ref);
    });
    
    if (allDailyLimitsQuery.docs.length > 0) {
      await batch.commit();
      console.log(`✅ DEBUG: Deleted ${allDailyLimitsQuery.docs.length} daily-limits documents`);
    } else {
      console.log('ℹ️ DEBUG: No daily-limits documents to delete');
    }

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${allDailyLimitsQuery.docs.length} daily-limits documents`,
      deletedCount: allDailyLimitsQuery.docs.length
    });

  } catch (error) {
    console.error('Error cleaning up daily-limits:', error);
    return NextResponse.json({
      error: 'Failed to cleanup daily-limits',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}