import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/stack-auth-api';
import { paddleCheckout, getPriceIdForTier } from '@/lib/paddle-server';

export async function POST(request: NextRequest) {
  const { user, userId, response } = await requireAuth();
  if (!user) {
    return response;
  }

  let tier: 'pro_monthly' | 'pro_yearly';
  let useTrial: boolean | undefined;
  
  try {
    const body = await request.json();
    tier = body.tier;
    useTrial = body.useTrial;
  } catch {
    return new NextResponse('Malformed JSON', { status: 400 });
  }

  if (!tier || !['pro_monthly', 'pro_yearly'].includes(tier)) {
    return new NextResponse('Invalid tier', { status: 400 });
  }

  try {
    const environment = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'production';
    const priceId = getPriceIdForTier(tier, environment);

    if (!priceId) {
      return new NextResponse('Price ID not configured', { status: 500 });
    }

    // Get email from Stack Auth user
    const email = user.primaryEmail || '';

    const checkout = await paddleCheckout.create({
      items: [{ priceId, quantity: 1 }],
      customer: email ? { email } : undefined,
      customData: {
        stackUserId: userId,
        tier,
        useTrial: String(useTrial || false),
      },
      settings: {
        displayMode: 'overlay',
        theme: 'light',
        successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/billing/success?checkout_id={checkout_id}`,
      },
    }) as { url: string };

    return NextResponse.json({ checkoutUrl: checkout.url });
  } catch (error) {
    console.error('Paddle checkout error:', error);
    return new NextResponse('Checkout failed', { status: 500 });
  }
}
