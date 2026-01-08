import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { paddleCheckout, getPriceIdForTier } from '@/lib/paddle-server';

/**
 * Handle POST requests to create a Paddle checkout for a pro subscription tier.
 *
 * Parses the request body for `tier` (`'pro_monthly'` or `'pro_yearly'`) and optional `useTrial`,
 * authenticates the caller, resolves the configured Paddle price ID for the environment,
 * attempts to retrieve the user's email from Clerk, and creates a Paddle checkout with
 * custom data including the Clerk user ID, tier, and trial flag.
 *
 * @param request - Incoming NextRequest with a JSON body containing `tier` and optional `useTrial`
 * @returns A NextResponse containing JSON `{ checkoutUrl: string }` on success; otherwise a NextResponse with an error message and an appropriate HTTP status (401, 400, or 500).
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
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