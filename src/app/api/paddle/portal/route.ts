import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/stack-auth-api';
import { paddleCheckout } from '@/lib/paddle-server';

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) {
    return response;
  }

  let customerId: string;
  
  try {
    const body = await request.json();
    customerId = body.customerId;
  } catch {
    return new NextResponse('Malformed JSON', { status: 400 });
  }

  if (!customerId) {
    return new NextResponse('Customer ID required', { status: 400 });
  }

  try {
    // Create a billing portal session
    const portal = await paddleCheckout.getCustomerPortalUrl(customerId);
    
    return NextResponse.json({ portalUrl: portal.url });
  } catch (error) {
    console.error('Paddle portal error:', error);
    return new NextResponse('Failed to create portal session', { status: 500 });
  }
}
