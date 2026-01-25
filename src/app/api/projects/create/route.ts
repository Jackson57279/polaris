import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/stack-auth-api';
import { checkAccess, trackUsage } from '@/lib/autumn-server';
import { convex } from '@/lib/convex-client';
import { api } from '../../../../../convex/_generated/api';

const FEATURE_ID = 'projects';

export async function POST(request: Request) {
  const { user, userId, response } = await requireAuth();
  if (!user) {
    return response;
  }

  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    const checkResult = await checkAccess({
      customer_id: userId,
      feature_id: FEATURE_ID,
    });

    if (!checkResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Project limit reached. Please upgrade to Pro for unlimited projects.',
          currentUsage: checkResult.usage || 0,
          limit: checkResult.included_usage || 0,
          allowed: false,
        },
        { status: 403 }
      );
    }

    const projectId = await convex.mutation(api.projects.create, { name });

    await trackUsage(userId, FEATURE_ID, 1);

    return NextResponse.json({ 
      projectId,
      tracked: true,
      currentUsage: (checkResult.usage || 0) + 1,
      limit: checkResult.included_usage || 0,
    });
  } catch (error) {
    console.error('Project creation error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
