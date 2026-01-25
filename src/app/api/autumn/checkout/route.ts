import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/stack-auth-api';
import { createCheckout } from '@/lib/autumn-server';

type Tier = 'pro_monthly' | 'pro_yearly';

function getProductIdForTier(tier: Tier): string {
  if (tier === 'pro_monthly') {
    return process.env.NEXT_PUBLIC_AUTUMN_PRO_MONTHLY_PRODUCT_ID || '';
  }
  return process.env.NEXT_PUBLIC_AUTUMN_PRO_YEARLY_PRODUCT_ID || '';
}

export async function POST(request: NextRequest) {
  const { user, userId, response } = await requireAuth();
  if (!user) {
    return response;
  }

  let tier: Tier;

  try {
    const body = await request.json();
    tier = body.tier;
  } catch {
    return new NextResponse('Malformed JSON', { status: 400 });
  }

  if (!tier || !['pro_monthly', 'pro_yearly'].includes(tier)) {
    return new NextResponse('Invalid tier', { status: 400 });
  }

  const productId = getProductIdForTier(tier);
  if (!productId) {
    return new NextResponse('Product ID not configured', { status: 500 });
  }

  try {
    const email = user.primaryEmail || undefined;
    const name = user.displayName || undefined;

    const checkout = await createCheckout({
      customer_id: userId,
      product_id: productId,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/success`,
      customer_data: {
        email,
        name,
      },
    });

    if (!checkout.url) {
      return NextResponse.json({ checkoutUrl: null, status: 'no_checkout_url' });
    }

    return NextResponse.json({ checkoutUrl: checkout.url });
  } catch (error) {
    console.error('Autumn checkout error:', error);
    return new NextResponse('Checkout failed', { status: 500 });
  }
}
