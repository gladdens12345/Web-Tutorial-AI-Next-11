import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // SECURITY: Disable in production to prevent information disclosure
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Test endpoints disabled in production' }, { status: 404 });
  }

  const email = request.nextUrl.searchParams.get('email');
  
  if (!email) {
    return NextResponse.json({ error: 'email parameter required' }, { status: 400 });
  }

  try {
    console.log('🔍 Looking up user by email:', email);
    
    // Try to find user by email
    const auth = getAuth();
    let userRecord;
    let userId;
    
    try {
      userRecord = await auth.getUserByEmail(email);
      userId = userRecord.uid;
      console.log('✅ Found user in Firebase Auth:', userId);
    } catch (error) {
      console.log('❌ User not found in Firebase Auth');
      
      // Try Firestore as fallback
      const usersSnapshot = await adminDb.collection('users')
        .where('email', '==', email)
        .limit(1)
        .get();
      
      if (!usersSnapshot.empty) {
        const doc = usersSnapshot.docs[0];
        userId = doc.id;
        console.log('✅ Found user in Firestore:', userId);
      } else {
        return NextResponse.json({ 
          error: 'User not found',
          email: email 
        }, { status: 404 });
      }
    }
    
    // Get current custom claims if user exists in Auth
    let currentClaims = {};
    if (userRecord) {
      currentClaims = userRecord.customClaims || {};
    }
    
    // Get Firestore data
    const firestoreDoc = await adminDb.collection('users').doc(userId).get();
    const firestoreData = firestoreDoc.exists ? firestoreDoc.data() : null;
    
    return NextResponse.json({
      success: true,
      userId: userId,
      email: email,
      customClaims: currentClaims,
      firestoreData: firestoreData,
      upgradeUrl: `https://webtutorialai.com/api/test/set-custom-claims?userId=${userId}`,
      instructions: [
        '1. Copy the upgradeUrl above and visit it in your browser',
        '2. Clear your extension storage and sign out/in to refresh tokens',
        '3. The extension should now recognize your premium status'
      ]
    });

  } catch (error) {
    console.error('❌ Error looking up user:', error);
    return NextResponse.json({
      error: 'Failed to lookup user',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}