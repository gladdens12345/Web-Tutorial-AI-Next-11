import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Force dynamic rendering to prevent static caching
export const dynamic = 'force-dynamic';

// Define built-in tasks and their access requirements
const BUILT_IN_TASKS = {
  // Free tasks (available to all users)
  'quick_question': {
    name: 'Quick Question',
    description: 'Ask a simple question and get a direct answer',
    tier: 'free',
    category: 'basic',
    steps: 1,
    maxTokens: 150,
    template: 'Answer this question directly and concisely: {question}'
  },
  'explain_page': {
    name: 'Explain This Page',
    description: 'Get an explanation of the current webpage content',
    tier: 'free',
    category: 'web',
    steps: 1,
    maxTokens: 300,
    template: 'Explain what this webpage is about and its main purpose: {pageContent}'
  },
  'summarize_content': {
    name: 'Summarize Content',
    description: 'Create a brief summary of webpage content',
    tier: 'free',
    category: 'content',
    steps: 1,
    maxTokens: 200,
    template: 'Summarize the key points of this content: {content}'
  },
  
  // Trial tasks (available during trial)
  'detailed_analysis': {
    name: 'Detailed Analysis',
    description: 'Comprehensive analysis of webpage content with insights',
    tier: 'trial',
    category: 'analysis',
    steps: 2,
    maxTokens: 500,
    template: 'Provide a detailed analysis of this content, including key insights and implications: {content}'
  },
  'research_assistance': {
    name: 'Research Assistance',
    description: 'Help with research tasks using webpage content as a starting point',
    tier: 'trial',
    category: 'research',
    steps: 2,
    maxTokens: 600,
    template: 'Help me research this topic. Based on this content: {content}, provide additional insights and suggest further research directions.'
  },
  'content_improvement': {
    name: 'Content Improvement',
    description: 'Suggest improvements for content, writing, or presentations',
    tier: 'trial',
    category: 'content',
    steps: 2,
    maxTokens: 400,
    template: 'Review this content and suggest specific improvements: {content}'
  },
  
  // Premium tasks (require premium subscription)
  'complex_workflow': {
    name: 'Complex Workflow',
    description: 'Multi-step workflow with advanced analysis and recommendations',
    tier: 'premium',
    category: 'workflow',
    steps: 3,
    maxTokens: 1000,
    template: 'Execute this complex workflow: Step 1: Analyze {content}. Step 2: Identify opportunities. Step 3: Provide actionable recommendations.'
  },
  'data_extraction': {
    name: 'Data Extraction',
    description: 'Extract and structure data from webpages',
    tier: 'premium',
    category: 'data',
    steps: 2,
    maxTokens: 800,
    template: 'Extract and structure the key data points from this content: {content}. Format the results clearly.'
  },
  'competitive_analysis': {
    name: 'Competitive Analysis',
    description: 'Analyze competitors and market positioning',
    tier: 'premium',
    category: 'business',
    steps: 3,
    maxTokens: 1200,
    template: 'Perform a competitive analysis based on this content: {content}. Include market positioning, strengths, weaknesses, and opportunities.'
  },
  'technical_review': {
    name: 'Technical Review',
    description: 'In-depth technical analysis and code review',
    tier: 'premium',
    category: 'technical',
    steps: 3,
    maxTokens: 1500,
    template: 'Conduct a thorough technical review of this content: {content}. Include architecture analysis, best practices, and improvement suggestions.'
  },
  'strategic_planning': {
    name: 'Strategic Planning',
    description: 'Develop strategic plans and roadmaps',
    tier: 'premium',
    category: 'strategy',
    steps: 4,
    maxTokens: 2000,
    template: 'Create a strategic plan based on this information: {content}. Include analysis, goals, timeline, and action items.'
  },
  'automated_workflow': {
    name: 'Automated Workflow',
    description: 'Set up automated task sequences with scheduling',
    tier: 'premium',
    category: 'automation',
    steps: 1,
    maxTokens: 500,
    template: 'This is an automated workflow task. Process: {content}',
    isAutomated: true
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
    const category = searchParams.get('category');

    if (!userId) {
      const response = NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      return addCorsHeaders(response);
    }

    console.log('Fetching available tasks for user:', userId, 'category:', category);

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

    // Filter tasks based on user's tier
    let allTasks = Object.entries(BUILT_IN_TASKS);
    if (category) {
      allTasks = allTasks.filter(([key, task]) => task.category === category);
    }

    const availableTasks = allTasks.filter(([key, task]) => {
      if (task.tier === 'free') return true;
      if (task.tier === 'trial') return userTier === 'trial' || userTier === 'premium';
      if (task.tier === 'premium') return userTier === 'premium';
      return false;
    }).map(([key, task]) => ({
      id: key,
      ...task,
      isBuiltIn: true,
      isAvailable: true
    }));

    // Get user's custom tasks (if they have premium)
    let customTasks: any[] = [];
    if (userTier === 'premium') {
      let customTasksQuery = adminDb.collection('custom_tasks')
        .where('userId', '==', userId)
        .where('isActive', '==', true);

      if (category) {
        customTasksQuery = customTasksQuery.where('category', '==', category);
      }

      const customTasksSnapshot = await customTasksQuery.get();
      customTasks = customTasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isBuiltIn: false,
        isAvailable: true
      }));
    }

    // Get locked tasks (for upselling)
    const lockedTasks = allTasks.filter(([key, task]) => {
      if (task.tier === 'free') return false;
      if (task.tier === 'trial') return userTier !== 'trial' && userTier !== 'premium';
      if (task.tier === 'premium') return userTier !== 'premium';
      return false;
    }).map(([key, task]) => ({
      id: key,
      ...task,
      isBuiltIn: true,
      isAvailable: false,
      lockReason: task.tier === 'premium' ? 'Requires Premium subscription' : 'Requires trial or Premium subscription'
    }));

    // Group by category
    const categories = {
      basic: availableTasks.filter(t => t.category === 'basic'),
      web: availableTasks.filter(t => t.category === 'web'),
      content: availableTasks.filter(t => t.category === 'content'),
      analysis: availableTasks.filter(t => t.category === 'analysis'),
      research: availableTasks.filter(t => t.category === 'research'),
      workflow: availableTasks.filter(t => t.category === 'workflow'),
      data: availableTasks.filter(t => t.category === 'data'),
      business: availableTasks.filter(t => t.category === 'business'),
      technical: availableTasks.filter(t => t.category === 'technical'),
      strategy: availableTasks.filter(t => t.category === 'strategy'),
      automation: availableTasks.filter(t => t.category === 'automation')
    };

    const response = NextResponse.json({
      success: true,
      user: {
        tier: userTier,
        subscriptionStatus: subscriptionStatus
      },
      tasks: {
        available: [...availableTasks, ...customTasks],
        locked: lockedTasks
      },
      capabilities: {
        canCreateCustomTasks: userTier === 'premium',
        canModifyTasks: userTier === 'premium',
        canScheduleTasks: userTier === 'premium',
        maxCustomTasks: userTier === 'premium' ? 20 : 0,
        maxTokensPerTask: userTier === 'premium' ? 2000 : userTier === 'trial' ? 600 : 300
      },
      categories: categories,
      summary: {
        totalAvailable: availableTasks.length + customTasks.length,
        totalLocked: lockedTasks.length,
        customTasks: customTasks.length
      }
    });
    return addCorsHeaders(response);

  } catch (error) {
    console.error('Error fetching tasks:', error);
    const response = NextResponse.json(
      { error: `Failed to fetch tasks: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
    return addCorsHeaders(response);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, action, taskData } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    console.log('Task action for user:', userId, 'action:', action);

    // Check feature access based on action
    let requiredFeature = 'custom_workflows';
    if (action.includes('automated') || action.includes('schedule')) {
      requiredFeature = 'task_automation';
    }

    const featureCheck = await fetch(`${request.nextUrl.origin}/api/features/check-access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        feature: requiredFeature,
        requestedAction: action
      }),
    });

    const featureAccess = await featureCheck.json();

    if (action === 'create_custom' || action === 'modify_custom') {
      if (!featureAccess.hasAccess) {
        return NextResponse.json({
          error: 'Premium subscription required for custom tasks',
          reason: 'premium_required',
          upgradeUrl: '/pricing?source=custom_tasks'
        }, { status: 403 });
      }

      if (!taskData || !taskData.name || !taskData.template) {
        return NextResponse.json({ 
          error: 'Task name and template are required' 
        }, { status: 400 });
      }

      // Create or update custom task
      const customTaskData = {
        userId: userId,
        name: taskData.name,
        description: taskData.description || '',
        template: taskData.template,
        category: taskData.category || 'custom',
        steps: taskData.steps || 1,
        maxTokens: Math.min(taskData.maxTokens || 500, 2000), // Cap at 2000 for premium
        isActive: true,
        isAutomated: taskData.isAutomated || false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      let taskId: string;
      if (action === 'create_custom') {
        const docRef = await adminDb.collection('custom_tasks').add(customTaskData);
        taskId = docRef.id;
      } else {
        // modify_custom
        if (!taskData.taskId) {
          return NextResponse.json({ error: 'Task ID is required for modification' }, { status: 400 });
        }
        
        await adminDb.collection('custom_tasks').doc(taskData.taskId).update({
          ...customTaskData,
          createdAt: undefined // Don't update creation date
        });
        taskId = taskData.taskId;
      }

      return NextResponse.json({
        success: true,
        taskId: taskId,
        task: {
          id: taskId,
          ...customTaskData
        },
        message: action === 'create_custom' ? 'Custom task created successfully' : 'Custom task updated successfully'
      });
    }

    if (action === 'delete_custom') {
      if (!featureAccess.hasAccess) {
        return NextResponse.json({
          error: 'Premium subscription required',
          reason: 'premium_required'
        }, { status: 403 });
      }

      if (!taskData || !taskData.taskId) {
        return NextResponse.json({ error: 'Task ID is required for deletion' }, { status: 400 });
      }

      // Verify the task belongs to the user
      const taskDoc = await adminDb.collection('custom_tasks').doc(taskData.taskId).get();
      if (!taskDoc.exists || taskDoc.data()?.userId !== userId) {
        return NextResponse.json({ error: 'Task not found or access denied' }, { status: 404 });
      }

      // Soft delete (mark as inactive)
      await adminDb.collection('custom_tasks').doc(taskData.taskId).update({
        isActive: false,
        deletedAt: new Date()
      });

      return NextResponse.json({
        success: true,
        message: 'Custom task deleted successfully'
      });
    }

    if (action === 'execute_task') {
      // Check if user can execute this specific task
      const taskId = taskData?.taskId;
      if (!taskId) {
        return NextResponse.json({ error: 'Task ID is required for execution' }, { status: 400 });
      }

      // Get task details (built-in or custom)
      let taskConfig;
      if (BUILT_IN_TASKS[taskId as keyof typeof BUILT_IN_TASKS]) {
        taskConfig = BUILT_IN_TASKS[taskId as keyof typeof BUILT_IN_TASKS];
        
        // Check if user has access to this built-in task
        const userTier = featureAccess.user?.tier || 'limited';
        if (taskConfig.tier === 'premium' && userTier !== 'premium') {
          return NextResponse.json({
            error: 'Premium subscription required for this task',
            reason: 'premium_required',
            upgradeUrl: '/pricing?source=task_execution'
          }, { status: 403 });
        }
        if (taskConfig.tier === 'trial' && userTier !== 'trial' && userTier !== 'premium') {
          return NextResponse.json({
            error: 'Trial or Premium subscription required for this task',
            reason: 'trial_required',
            upgradeUrl: '/pricing?source=task_execution'
          }, { status: 403 });
        }
      } else {
        // Get custom task
        const taskDoc = await adminDb.collection('custom_tasks').doc(taskId).get();
        if (!taskDoc.exists || taskDoc.data()?.userId !== userId) {
          return NextResponse.json({ error: 'Task not found or access denied' }, { status: 404 });
        }
        taskConfig = taskDoc.data();
      }

      // Log task execution
      const executionLog = {
        userId: userId,
        taskId: taskId,
        taskName: taskConfig?.name || 'Unknown',
        executedAt: new Date(),
        context: taskData.context || {},
        success: true
      };

      try {
        await adminDb.collection('task_executions').add(executionLog);
      } catch (logError) {
        console.warn('Failed to log task execution:', logError);
      }

      return NextResponse.json({
        success: true,
        taskId: taskId,
        execution: {
          taskName: taskConfig?.name,
          steps: taskConfig?.steps || 1,
          maxTokens: taskConfig?.maxTokens || 300,
          template: taskConfig?.template
        },
        message: 'Task execution logged successfully'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error in task management:', error);
    return NextResponse.json(
      { error: `Task management failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}