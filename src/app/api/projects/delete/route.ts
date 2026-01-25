import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/stack-auth-api';
import { trackUsage } from '@/lib/autumn-server';
import { convex } from '@/lib/convex-client';
import { api } from '../../../../../convex/_generated/api';
import type { Id } from '../../../../../convex/_generated/dataModel';

const FEATURE_ID = 'projects';

export async function DELETE(request: Request) {
  const { user, userId, response } = await requireAuth();
  if (!user) {
    return response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    await convex.mutation(api.projects.deleteProject, { 
      id: projectId as Id<"projects"> 
    });

    await trackUsage(userId, FEATURE_ID, -1);

    return NextResponse.json({ 
      success: true,
      message: 'Project deleted and usage updated',
    });
  } catch (error) {
    console.error('Project deletion error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
