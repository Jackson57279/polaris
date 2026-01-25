import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/stack-auth-api';
import { checkAccess, trackUsage } from '@/lib/autumn-server';

const FEATURE_ID = 'projects';

export async function POST() {
  const { user, userId, response } = await requireAuth();
  if (!user) {
    return response;
  }

  try {
    const checkResult = await checkAccess({
      customer_id: userId,
      feature_id: FEATURE_ID,
    });

    if (!checkResult.allowed) {
      return NextResponse.json(
        { 
          allowed: false, 
          error: 'Project limit reached. Please upgrade to Pro for unlimited projects.',
          currentUsage: checkResult.usage || 0,
          limit: checkResult.included_usage || 0,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({ 
      allowed: true,
      currentUsage: checkResult.usage || 0,
      limit: checkResult.included_usage || 0,
    });
  } catch (error) {
    console.error('Autumn check error:', error);
    return NextResponse.json({ 
      allowed: true,
      fallback: true,
      message: 'Proceeding without Autumn check',
    });
  }
}

export async function PUT() {
  const { user, userId, response } = await requireAuth();
  if (!user) {
    return response;
  }

  try {
    await trackUsage(userId, FEATURE_ID, 1);

    return NextResponse.json({ tracked: true });
  } catch (error) {
    console.error('Autumn track error:', error);
    return NextResponse.json(
      { tracked: false, error: 'Failed to track usage' },
      { status: 500 }
    );
  }
}
