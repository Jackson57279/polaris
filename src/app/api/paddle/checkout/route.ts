import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { paddleCheckout, getPriceIdForTier } from '@/lib/paddle-server';

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { tier, useTrial } = await request.json();

  if (!tier || !['pro_monthly', 'pro_yearly'].includes(tier)) {
    return new NextResponse('Invalid tier', { status: 400 });
  }

  try {
    const environment = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'production';
    const priceId = getPriceIdForTier(tier, environment);

    if (!priceId) {
      return new NextResponse('Price ID not configured', { status: 500 });
    }

    const clerkResponse = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      },
    });

    if (!clerkResponse.ok) {
      return new NextResponse('Failed to get user info', { status: 500 });
    }

    const clerkUser = await clerkResponse.json();
    const email = clerkUser.email_addresses?.[0]?.email_address;

    const checkout = await paddleCheckout.create({
      items: [{ priceId, quantity: 1 }],
      customer: email ? { email } : undefined,
      customData: {
        clerkUserId: userId,
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
