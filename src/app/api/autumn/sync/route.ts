import { NextResponse } from 'next/server';
import type { Customer } from 'autumn-js';
import { requireAuth } from '@/lib/stack-auth-api';
import { getCustomer } from '@/lib/autumn-server';
import { convex } from '@/lib/convex-client';
import { api } from '../../../../../convex/_generated/api';

const FREE_PROJECT_LIMIT = 10;

type Tier = 'free' | 'pro_monthly' | 'pro_yearly';
type SubscriptionStatus = 'free' | 'trialing' | 'active' | 'paused' | 'canceled' | 'past_due';

function getProductIdForTier(tier: Exclude<Tier, 'free'>): string {
  if (tier === 'pro_monthly') {
    return process.env.NEXT_PUBLIC_AUTUMN_PRO_MONTHLY_PRODUCT_ID || '';
  }
  return process.env.NEXT_PUBLIC_AUTUMN_PRO_YEARLY_PRODUCT_ID || '';
}

function getTierFromProductId(productId: string): Tier {
  if (productId === getProductIdForTier('pro_yearly')) {
    return 'pro_yearly';
  }
  if (productId === getProductIdForTier('pro_monthly')) {
    return 'pro_monthly';
  }
  return 'free';
}

function mapStatus(status?: string): SubscriptionStatus {
  if (status === 'trialing') return 'trialing';
  if (status === 'past_due') return 'past_due';
  if (status === 'active') return 'active';
  if (status === 'scheduled') return 'active';
  if (status === 'expired') return 'canceled';
  return 'free';
}

function deriveSubscription(customer: Customer) {
  const products = customer.products ?? [];
  const paidProduct = products.find((product) => {
    return product.id === getProductIdForTier('pro_monthly') || product.id === getProductIdForTier('pro_yearly');
  });

  if (!paidProduct) {
    return {
      subscriptionStatus: 'free' as const,
      subscriptionTier: 'free' as const,
      subscriptionPlanId: undefined,
      trialEndsAt: undefined,
      projectLimit: FREE_PROJECT_LIMIT,
    };
  }

  const subscriptionStatus = mapStatus(paidProduct.status);
  const subscriptionTier = getTierFromProductId(paidProduct.id);
  const trialEndsAt = paidProduct.trial_ends_at ?? undefined;
  const projectLimit = subscriptionStatus === 'active' || subscriptionStatus === 'trialing' || subscriptionStatus === 'past_due'
    ? -1
    : FREE_PROJECT_LIMIT;

  return {
    subscriptionStatus,
    subscriptionTier,
    subscriptionPlanId: paidProduct.id,
    trialEndsAt,
    projectLimit,
  };
}

function isAutumnNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = 'code' in error ? (error as { code?: unknown }).code : undefined;
  if (typeof code !== 'string') {
    return false;
  }

  return code === 'not_found' || code === 'customer_not_found';
}

export async function POST() {
  const { user, userId, response } = await requireAuth();
  if (!user) {
    return response;
  }

  try {
    const customer = await getCustomer(userId);
    const subscription = deriveSubscription(customer);

    await convex.mutation(api.users.updateSubscription, {
      stackUserId: userId,
      autumnCustomerId: customer.id ?? userId,
      ...subscription,
    });

    return NextResponse.json({ synced: true, subscription });
  } catch (error) {
    if (isAutumnNotFoundError(error)) {
      const subscription = {
        subscriptionStatus: 'free' as const,
        subscriptionTier: 'free' as const,
        subscriptionPlanId: undefined,
        trialEndsAt: undefined,
        projectLimit: FREE_PROJECT_LIMIT,
      };

      await convex.mutation(api.users.updateSubscription, {
        stackUserId: userId,
        autumnCustomerId: userId,
        ...subscription,
      });

      return NextResponse.json({ synced: true, subscription });
    }

    console.error('Autumn sync error:', error);
    return new NextResponse('Failed to sync subscription', { status: 500 });
  }
}
