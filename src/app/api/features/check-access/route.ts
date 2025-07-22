import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Define premium features and their access requirements
const PREMIUM_FEATURES = {
  // Role-based features
  'custom_roles': {
    name: 'Custom Roles',
    description: 'Create and use custom AI roles beyond the basic set',
    requiredTier: 'premium'
  },
  'advanced_roles': {
    name: 'Advanced Roles',
    description: 'Access to specialized roles like Data Scientist, Legal Advisor, etc.',
    requiredTier: 'premium'
  },
  'role_customization': {
    name: 'Role Customization',
    description: 'Modify and personalize existing roles',
    requiredTier: 'premium'
  },
  
  // Task-based features
  'complex_tasks': {
    name: 'Complex Tasks',
    description: 'Multi-step tasks and advanced workflows',
    requiredTier: 'premium'
  },
  'task_automation': {
    name: 'Task Automation',
    description: 'Automated task execution and scheduling',
    requiredTier: 'premium'
  },
  'custom_workflows': {
    name: 'Custom Workflows',
    description: 'Create personalized task workflows',
    requiredTier: 'premium'
  },
  
  // Knowledge base features
  'advanced_knowledge_base': {
    name: 'Advanced Knowledge Base',
    description: 'Access to specialized knowledge domains',
    requiredTier: 'trial' // Available during trial
  },
  'knowledge_base_search': {
    name: 'Knowledge Base Search',
    description: 'Search across the full knowledge base',
    requiredTier: 'trial'
  },
  
  // Extension features
  'unlimited_responses': {
    name: 'Unlimited AI Responses',
    description: 'No daily limits on AI interactions',
    requiredTier: 'premium'
  },
  'priority_processing': {
    name: 'Priority Processing',
    description: 'Faster response times and priority queue',
    requiredTier: 'premium'
  },
  'advanced_settings': {
    name: 'Advanced Settings',
    description: 'Fine-tune AI behavior and response styles',
    requiredTier: 'premium'
  },
  
  // Web interaction features
  'deep_web_analysis': {
    name: 'Deep Web Analysis',
    description: 'Advanced webpage content analysis and understanding',
    requiredTier: 'premium'
  },
  'multi_tab_context': {
    name: 'Multi-Tab Context',
    description: 'AI awareness across multiple browser tabs',
    requiredTier: 'premium'
  },
  'web_automation': {
    name: 'Web Automation',
    description: 'Automated web interactions and form filling',
    requiredTier: 'premium'
  }
} as const;

export async function POST(request: NextRequest) {
  try {
    const { userId, feature, requestedAction } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!feature) {
      return NextResponse.json({ error: 'Feature name is required' }, { status: 400 });
    }

    console.log('Checking feature access for user:', userId, 'feature:', feature);

    // Get user document
    const userDocRef = adminDb.collection('users').doc(userId);
    const userDoc = await userDocRef.get();
    
    if (!userDoc.exists) {
      return NextResponse.json({ 
        error: 'User not found',
        hasAccess: false,
        reason: 'user_not_found'
      }, { status: 404 });
    }

    const userData = userDoc.data();
    const subscriptionStatus = userData?.subscriptionStatus || 'limited';

    // Check if feature exists
    const featureConfig = PREMIUM_FEATURES[feature as keyof typeof PREMIUM_FEATURES];
    if (!featureConfig) {
      return NextResponse.json({
        hasAccess: false,
        reason: 'unknown_feature',
        error: `Unknown feature: ${feature}`
      }, { status: 400 });
    }

    // Determine user's access level
    let userTier = 'limited';
    if (subscriptionStatus === 'premium') {
      userTier = 'premium';
    } else if (subscriptionStatus === 'trial') {
      // Check if trial is still active
      const trialEndDate = userData?.subscriptionEndDate ? userData.subscriptionEndDate.toDate() : null;
      if (trialEndDate && trialEndDate > new Date()) {
        userTier = 'trial';
      } else {
        userTier = 'limited';
      }
    } else if (subscriptionStatus === 'anonymous') {
      userTier = 'anonymous';
    }

    // Check feature access
    const requiredTier = featureConfig.requiredTier;
    let hasAccess = false;
    let reason = '';

    if (requiredTier === 'premium') {
      hasAccess = userTier === 'premium';
      reason = hasAccess ? 'premium_access' : 'premium_required';
    } else if (requiredTier === 'trial') {
      hasAccess = userTier === 'premium' || userTier === 'trial';
      reason = hasAccess ? (userTier === 'premium' ? 'premium_access' : 'trial_access') : 'trial_or_premium_required';
    } else {
      // Basic features available to all
      hasAccess = true;
      reason = 'basic_access';
    }

    // Log feature access attempt
    const accessLog = {
      userId: userId,
      feature: feature,
      action: requestedAction || 'check_access',
      hasAccess: hasAccess,
      userTier: userTier,
      requiredTier: requiredTier,
      timestamp: new Date(),
      subscriptionStatus: subscriptionStatus
    };

    // Store access log for analytics (optional)
    try {
      await adminDb.collection('feature_access_logs').add(accessLog);
    } catch (logError) {
      console.warn('Failed to log feature access:', logError);
    }

    // Return access result
    return NextResponse.json({
      hasAccess: hasAccess,
      reason: reason,
      feature: {
        name: featureConfig.name,
        description: featureConfig.description,
        requiredTier: featureConfig.requiredTier
      },
      user: {
        tier: userTier,
        subscriptionStatus: subscriptionStatus,
        trialEndDate: userData?.subscriptionEndDate ? userData.subscriptionEndDate.toDate().toISOString() : null
      },
      upgradeInfo: hasAccess ? null : {
        upgradeUrl: '/pricing?source=feature_gate&feature=' + encodeURIComponent(feature),
        message: requiredTier === 'premium' ? 
          'This feature requires a Premium subscription. Upgrade now for unlimited access!' :
          'This feature requires at least a free trial. Start your 7-day trial today!'
      }
    });

  } catch (error) {
    console.error('Error checking feature access:', error);
    
    const errorDetails = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : { message: 'Unknown error' };
    
    console.error('Error details:', errorDetails);
    
    return NextResponse.json({
      hasAccess: false,
      reason: 'server_error',
      error: `Failed to check feature access: ${errorDetails.message}`
    }, { status: 500 });
  }
}

// GET method to list all features and their requirements
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    let userTier = 'anonymous';
    let subscriptionStatus = 'anonymous';

    if (userId) {
      // Get user's current tier
      const userDocRef = adminDb.collection('users').doc(userId);
      const userDoc = await userDocRef.get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        subscriptionStatus = userData?.subscriptionStatus || 'limited';
        
        if (subscriptionStatus === 'premium') {
          userTier = 'premium';
        } else if (subscriptionStatus === 'trial') {
          const trialEndDate = userData?.subscriptionEndDate ? userData.subscriptionEndDate.toDate() : null;
          if (trialEndDate && trialEndDate > new Date()) {
            userTier = 'trial';
          } else {
            userTier = 'limited';
          }
        } else {
          userTier = subscriptionStatus;
        }
      }
    }

    // Build feature list with access status
    const features = Object.entries(PREMIUM_FEATURES).map(([key, config]) => {
      let hasAccess = false;
      
      if (config.requiredTier === 'premium') {
        hasAccess = userTier === 'premium';
      } else if (config.requiredTier === 'trial') {
        hasAccess = userTier === 'premium' || userTier === 'trial';
      } else {
        hasAccess = true;
      }

      return {
        key: key,
        name: config.name,
        description: config.description,
        requiredTier: config.requiredTier,
        hasAccess: hasAccess,
        category: key.includes('role') ? 'roles' : 
                  key.includes('task') ? 'tasks' :
                  key.includes('knowledge') ? 'knowledge' :
                  key.includes('web') ? 'web' : 'extension'
      };
    });

    // Group features by category
    const categorizedFeatures = {
      roles: features.filter(f => f.category === 'roles'),
      tasks: features.filter(f => f.category === 'tasks'),
      knowledge: features.filter(f => f.category === 'knowledge'),
      extension: features.filter(f => f.category === 'extension'),
      web: features.filter(f => f.category === 'web')
    };

    return NextResponse.json({
      success: true,
      user: userId ? {
        tier: userTier,
        subscriptionStatus: subscriptionStatus
      } : null,
      features: categorizedFeatures,
      summary: {
        total: features.length,
        accessible: features.filter(f => f.hasAccess).length,
        premium: features.filter(f => f.requiredTier === 'premium').length,
        trial: features.filter(f => f.requiredTier === 'trial').length
      }
    });

  } catch (error) {
    console.error('Error listing features:', error);
    return NextResponse.json(
      { error: `Failed to list features: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}