import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/stack-auth-api';
import { openBillingPortal } from '@/lib/autumn-server';

export async function POST(request: NextRequest) {
  const { user, userId, response } = await requireAuth();
  if (!user) {
    return response;
  }

  let returnUrl: string | undefined;
  try {
    const body = await request.json();
    returnUrl = body.returnUrl;
  } catch {
    returnUrl = undefined;
  }

  try {
    const portal = await openBillingPortal(userId, {
      return_url: returnUrl || process.env.NEXT_PUBLIC_APP_URL,
    });

    return NextResponse.json({ portalUrl: portal.url });
  } catch (error) {
    console.error('Autumn portal error:', error);
    return new NextResponse('Failed to create portal session', { status: 500 });
  }
}
