import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Force dynamic rendering to prevent static caching
export const dynamic = 'force-dynamic';

// Define built-in roles and their access requirements
const BUILT_IN_ROLES = {
  // Free roles (available to all users)
  'general_assistant': {
    name: 'General Assistant',
    description: 'Helpful AI assistant for general questions and tasks',
    tier: 'free',
    prompt: 'You are a helpful AI assistant. Provide clear, accurate, and helpful responses.',
    category: 'general'
  },
  'web_helper': {
    name: 'Web Helper',
    description: 'Assists with web-based tasks and content understanding',
    tier: 'free',
    prompt: 'You are a web helper AI. Help users understand and work with web content effectively.',
    category: 'web'
  },
  
  // Trial roles (available during trial)
  'research_assistant': {
    name: 'Research Assistant',
    description: 'Helps with research, analysis, and information gathering',
    tier: 'trial',
    prompt: 'You are a research assistant. Help users find, analyze, and synthesize information effectively.',
    category: 'research'
  },
  'content_creator': {
    name: 'Content Creator',
    description: 'Assists with content creation, writing, and editing',
    tier: 'trial',
    prompt: 'You are a content creation specialist. Help users create engaging, well-structured content.',
    category: 'content'
  },
  
  // Premium roles (require premium subscription)
  'data_scientist': {
    name: 'Data Scientist',
    description: 'Advanced data analysis, statistics, and machine learning guidance',
    tier: 'premium',
    prompt: 'You are a data scientist expert. Provide advanced guidance on data analysis, statistics, and machine learning.',
    category: 'technical'
  },
  'legal_advisor': {
    name: 'Legal Advisor',
    description: 'Legal research and document analysis (for informational purposes)',
    tier: 'premium',
    prompt: 'You are a legal research assistant. Provide legal information and analysis for educational purposes only. Always recommend consulting with a qualified attorney.',
    category: 'professional'
  },
  'business_strategist': {
    name: 'Business Strategist',
    description: 'Business planning, strategy, and market analysis',
    tier: 'premium',
    prompt: 'You are a business strategy expert. Help with business planning, market analysis, and strategic decision-making.',
    category: 'business'
  },
  'technical_expert': {
    name: 'Technical Expert',
    description: 'Advanced technical guidance for development and engineering',
    tier: 'premium',
    prompt: 'You are a technical expert. Provide advanced guidance on software development, engineering, and technical problem-solving.',
    category: 'technical'
  },
  'creative_director': {
    name: 'Creative Director',
    description: 'Creative guidance for design, marketing, and brand development',
    tier: 'premium',
    prompt: 'You are a creative director. Provide expert guidance on design, marketing, branding, and creative projects.',
    category: 'creative'
  }
} as const;

// Helper function to add CORS headers
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function OPTIONS() {
  const response = NextResponse.json({});
  return addCorsHeaders(response);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      const response = NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      return addCorsHeaders(response);
    }

    console.log('Fetching available roles for user:', userId);

    // Check user's subscription status
    const userDocRef = adminDb.collection('users').doc(userId);
    const userDoc = await userDocRef.get();
    
    if (!userDoc.exists) {
      const response = NextResponse.json({ error: 'User not found' }, { status: 404 });
      return addCorsHeaders(response);
    }

    const userData = userDoc.data();
    const subscriptionStatus = userData?.subscriptionStatus || 'limited';

    // Determine user's access level
    let userTier = 'limited';
    if (subscriptionStatus === 'premium') {
      userTier = 'premium';
    } else if (subscriptionStatus === 'trial') {
      const trialEndDate = userData?.subscriptionEndDate ? userData.subscriptionEndDate.toDate() : null;
      if (trialEndDate && trialEndDate > new Date()) {
        userTier = 'trial';
      }
    }

    // Filter roles based on user's tier
    const availableRoles = Object.entries(BUILT_IN_ROLES).filter(([key, role]) => {
      if (role.tier === 'free') return true;
      if (role.tier === 'trial') return userTier === 'trial' || userTier === 'premium';
      if (role.tier === 'premium') return userTier === 'premium';
      return false;
    }).map(([key, role]) => ({
      id: key,
      ...role,
      isBuiltIn: true,
      isAvailable: true
    }));

    // Get user's custom roles (if they have premium)
    let customRoles: any[] = [];
    if (userTier === 'premium') {
      const customRolesQuery = await adminDb.collection('custom_roles')
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .get();

      customRoles = customRolesQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isBuiltIn: false,
        isAvailable: true
      }));
    }

    // Get locked roles (for upselling)
    const lockedRoles = Object.entries(BUILT_IN_ROLES).filter(([key, role]) => {
      if (role.tier === 'free') return false;
      if (role.tier === 'trial') return userTier !== 'trial' && userTier !== 'premium';
      if (role.tier === 'premium') return userTier !== 'premium';
      return false;
    }).map(([key, role]) => ({
      id: key,
      ...role,
      isBuiltIn: true,
      isAvailable: false,
      lockReason: role.tier === 'premium' ? 'Requires Premium subscription' : 'Requires trial or Premium subscription'
    }));

    const response = NextResponse.json({
      success: true,
      user: {
        tier: userTier,
        subscriptionStatus: subscriptionStatus
      },
      roles: {
        available: [...availableRoles, ...customRoles],
        locked: lockedRoles
      },
      capabilities: {
        canCreateCustomRoles: userTier === 'premium',
        canModifyRoles: userTier === 'premium',
        maxCustomRoles: userTier === 'premium' ? 10 : 0
      },
      categories: {
        general: availableRoles.filter(r => r.category === 'general'),
        web: availableRoles.filter(r => r.category === 'web'),
        research: availableRoles.filter(r => r.category === 'research'),
        content: availableRoles.filter(r => r.category === 'content'),
        technical: availableRoles.filter(r => r.category === 'technical'),
        professional: availableRoles.filter(r => r.category === 'professional'),
        business: availableRoles.filter(r => r.category === 'business'),
        creative: availableRoles.filter(r => r.category === 'creative')
      }
    });
    return addCorsHeaders(response);

  } catch (error) {
    console.error('Error fetching roles:', error);
    const response = NextResponse.json(
      { error: `Failed to fetch roles: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
    return addCorsHeaders(response);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, action, roleData } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    console.log('Role action for user:', userId, 'action:', action);

    // Check if user has premium access for custom roles
    const featureCheck = await fetch(`${request.nextUrl.origin}/api/features/check-access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        feature: 'custom_roles',
        requestedAction: action
      }),
    });

    const featureAccess = await featureCheck.json();

    if (action === 'create_custom' || action === 'modify_custom') {
      if (!featureAccess.hasAccess) {
        return NextResponse.json({
          error: 'Premium subscription required for custom roles',
          reason: 'premium_required',
          upgradeUrl: '/pricing?source=custom_roles'
        }, { status: 403 });
      }

      if (!roleData || !roleData.name || !roleData.prompt) {
        return NextResponse.json({ 
          error: 'Role name and prompt are required' 
        }, { status: 400 });
      }

      // Create or update custom role
      const customRoleData = {
        userId: userId,
        name: roleData.name,
        description: roleData.description || '',
        prompt: roleData.prompt,
        category: roleData.category || 'custom',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      let roleId: string;
      if (action === 'create_custom') {
        const docRef = await adminDb.collection('custom_roles').add(customRoleData);
        roleId = docRef.id;
      } else {
        // modify_custom
        if (!roleData.roleId) {
          return NextResponse.json({ error: 'Role ID is required for modification' }, { status: 400 });
        }
        
        await adminDb.collection('custom_roles').doc(roleData.roleId).update({
          ...customRoleData,
          createdAt: undefined // Don't update creation date
        });
        roleId = roleData.roleId;
      }

      return NextResponse.json({
        success: true,
        roleId: roleId,
        role: {
          id: roleId,
          ...customRoleData
        },
        message: action === 'create_custom' ? 'Custom role created successfully' : 'Custom role updated successfully'
      });
    }

    if (action === 'delete_custom') {
      if (!featureAccess.hasAccess) {
        return NextResponse.json({
          error: 'Premium subscription required',
          reason: 'premium_required'
        }, { status: 403 });
      }

      if (!roleData || !roleData.roleId) {
        return NextResponse.json({ error: 'Role ID is required for deletion' }, { status: 400 });
      }

      // Verify the role belongs to the user
      const roleDoc = await adminDb.collection('custom_roles').doc(roleData.roleId).get();
      if (!roleDoc.exists || roleDoc.data()?.userId !== userId) {
        return NextResponse.json({ error: 'Role not found or access denied' }, { status: 404 });
      }

      // Soft delete (mark as inactive)
      await adminDb.collection('custom_roles').doc(roleData.roleId).update({
        isActive: false,
        deletedAt: new Date()
      });

      return NextResponse.json({
        success: true,
        message: 'Custom role deleted successfully'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error in role management:', error);
    return NextResponse.json(
      { error: `Role management failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}