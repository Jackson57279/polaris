/**
 * Paddle Webhook Handler
 * Handles subscription events from Paddle
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhook, PaddleWebhookEvent } from '@/lib/paddle-server';
import { convex } from '@/lib/convex-client';
import { api } from '../../../../../convex/_generated/api';

// Duplicated from convex/users.ts to avoid cross-module import issues
const FREE_PROJECT_LIMIT = 10;

// Explicit price ID to tier mapping loaded from environment variables
const PRICE_ID_TO_TIER: Record<string, 'pro_monthly' | 'pro_yearly'> = {};

function initializePriceIdMapping() {
  const sandboxMonthly = process.env.PADDLE_SANDBOX_MONTHLY_PRICE_ID;
  const sandboxYearly = process.env.PADDLE_SANDBOX_YEARLY_PRICE_ID;
  const prodMonthly = process.env.NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID;
  const prodYearly = process.env.NEXT_PUBLIC_PADDLE_PRO_YEARLY_PRICE_ID;

  if (sandboxMonthly) PRICE_ID_TO_TIER[sandboxMonthly] = 'pro_monthly';
  if (sandboxYearly) PRICE_ID_TO_TIER[sandboxYearly] = 'pro_yearly';
  if (prodMonthly) PRICE_ID_TO_TIER[prodMonthly] = 'pro_monthly';
  if (prodYearly) PRICE_ID_TO_TIER[prodYearly] = 'pro_yearly';
}

initializePriceIdMapping();

export async function POST(request: NextRequest) {
  const signature = request.headers.get('paddle-signature');
  const body = await request.text();

  if (!signature) {
    console.error('Missing Paddle signature in webhook request');
    return new NextResponse('Missing signature', { status: 400 });
  }

  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('PADDLE_WEBHOOK_SECRET not configured');
    return new NextResponse('Webhook secret not configured', { status: 500 });
  }

  try {
    const event = verifyWebhook(body, signature, webhookSecret);
    console.log(`Processing Paddle webhook: ${event.eventType}`, { eventId: event.id });

    await handleWebhookEvent(event);

    return new NextResponse('Webhook processed', { status: 200 });
  } catch (error) {
    console.error('Webhook processing failed:', error);
    return new NextResponse('Webhook processing failed', { status: 500 });
  }
}

async function handleWebhookEvent(event: PaddleWebhookEvent) {
  const { eventType, data } = event;

  switch (eventType) {
    case 'customer.created':
      await handleCustomerCreated(data);
      break;

    case 'subscription.created':
    case 'subscription.activated':
      await handleSubscriptionCreated(data);
      break;

    case 'subscription.trialing':
      await handleSubscriptionTrialing(data);
      break;

    case 'subscription.trial_completed':
      await handleTrialCompleted(data);
      break;

    case 'subscription.trial_canceled':
      await handleTrialCanceled(data);
      break;

    case 'subscription.updated':
      await handleSubscriptionUpdated(data);
      break;

    case 'subscription.paused':
      await handleSubscriptionPaused(data);
      break;

    case 'subscription.resumed':
      await handleSubscriptionResumed(data);
      break;

    case 'subscription.canceled':
      await handleSubscriptionCanceled(data);
      break;

    case 'transaction.completed':
      await handleTransactionCompleted(data);
      break;

    case 'invoice.paid':
      await handleInvoicePaid(data);
      break;

    default:
      console.log(`Unhandled Paddle event: ${eventType}`);
  }
}

async function handleCustomerCreated(data: Record<string, unknown>) {
  const customData = data.customData as Record<string, string> | undefined;
  
  if (customData?.stackUserId) {
    const user = await convex.query(api.users.getUserByStackUserId, { 
      stackUserId: customData.stackUserId 
    });

    if (user) {
      await convex.mutation(api.users.updateSubscription, {
        stackUserId: customData.stackUserId,
        paddleCustomerId: data.id as string,
      });
      console.log(`Linked user ${user._id} to Paddle customer ${data.id}`);
    }
  }
}

async function handleSubscriptionCreated(data: Record<string, unknown>) {
  const customerId = data.customerId as string;
  const items = data.items as Array<{ price?: { id: string } }> | undefined;
  const currentBillingPeriod = data.currentBillingPeriod as { startsAt: string; endsAt: string } | undefined;

  const user = await convex.query(api.users.getUserByPaddleCustomerId, { 
    paddleCustomerId: customerId 
  });

  if (!user) {
    console.error(`User not found for Paddle customer ${customerId}`);
    return;
  }

  const tier = getTierFromPriceId(items?.[0]?.price?.id);
  const trialEndsAt = calculateTrialEnd(currentBillingPeriod);

  await convex.mutation(api.users.updateSubscription, {
    stackUserId: user.stackUserId,
    paddleSubscriptionId: data.id as string,
    subscriptionStatus: data.status as string,
    subscriptionTier: tier,
    subscriptionPlanId: items?.[0]?.price?.id,
    trialEndsAt,
    projectLimit: -1,
  });

  console.log(`Subscription ${data.id} created for user ${user._id}`);
}

async function handleSubscriptionTrialing(data: Record<string, unknown>) {
  const customerId = data.customerId as string;
  const currentBillingPeriod = data.currentBillingPeriod as { startsAt: string; endsAt: string } | undefined;

  const user = await convex.query(api.users.getUserByPaddleCustomerId, { 
    paddleCustomerId: customerId 
  });

  if (!user) {
    console.error(`User not found for Paddle customer ${customerId}`);
    return;
  }

  const trialEndsAt = calculateTrialEnd(currentBillingPeriod);

  await convex.mutation(api.users.updateSubscription, {
    stackUserId: user.stackUserId,
    paddleSubscriptionId: data.id as string,
    subscriptionStatus: 'trialing',
    trialEndsAt,
    projectLimit: -1,
  });

  console.log(`Trial started for user ${user._id}, ends at ${trialEndsAt ? new Date(trialEndsAt).toISOString() : 'unknown'}`);
}

async function handleTrialCompleted(data: Record<string, unknown>) {
  const customerId = data.customerId as string;

  const user = await convex.query(api.users.getUserByPaddleCustomerId, { 
    paddleCustomerId: customerId 
  });

  if (!user) {
    console.error(`User not found for Paddle customer ${customerId}`);
    return;
  }

  await convex.mutation(api.users.updateSubscription, {
    stackUserId: user.stackUserId,
    subscriptionStatus: 'active',
  });

  console.log(`Trial completed for user ${user._id}, subscription now active`);
}

async function handleTrialCanceled(data: Record<string, unknown>) {
  const customerId = data.customerId as string;

  const user = await convex.query(api.users.getUserByPaddleCustomerId, { 
    paddleCustomerId: customerId 
  });

  if (!user) {
    console.error(`User not found for Paddle customer ${customerId}`);
    return;
  }

  await convex.mutation(api.users.updateSubscription, {
    stackUserId: user.stackUserId,
    subscriptionStatus: 'free',
    subscriptionTier: 'free',
    trialEndsAt: undefined,
    projectLimit: FREE_PROJECT_LIMIT,
  });

  console.log(`Trial canceled for user ${user._id}, reverted to free tier`);
}

async function handleSubscriptionUpdated(data: Record<string, unknown>) {
  const customerId = data.customerId as string;
  const items = data.items as Array<{ price?: { id: string } }> | undefined;

  const user = await convex.query(api.users.getUserByPaddleCustomerId, { 
    paddleCustomerId: customerId 
  });

  if (!user) {
    console.error(`User not found for Paddle customer ${customerId}`);
    return;
  }

  const tier = items?.[0] ? getTierFromPriceId(items[0].price?.id) : user.subscriptionTier;

  await convex.mutation(api.users.updateSubscription, {
    stackUserId: user.stackUserId,
    paddleSubscriptionId: data.id as string,
    subscriptionStatus: data.status as string,
    subscriptionTier: tier,
    subscriptionPlanId: items?.[0]?.price?.id,
  });

  console.log(`Subscription ${data.id} updated for user ${user._id}`);
}

async function handleSubscriptionPaused(data: Record<string, unknown>) {
  const customerId = data.customerId as string;

  const user = await convex.query(api.users.getUserByPaddleCustomerId, { 
    paddleCustomerId: customerId 
  });

  if (!user) {
    console.error(`User not found for Paddle customer ${customerId}`);
    return;
  }

  await convex.mutation(api.users.updateSubscription, {
    stackUserId: user.stackUserId,
    subscriptionStatus: 'paused',
  });

  console.log(`Subscription ${data.id} paused for user ${user._id}`);
}

async function handleSubscriptionResumed(data: Record<string, unknown>) {
  const customerId = data.customerId as string;

  const user = await convex.query(api.users.getUserByPaddleCustomerId, { 
    paddleCustomerId: customerId 
  });

  if (!user) {
    console.error(`User not found for Paddle customer ${customerId}`);
    return;
  }

  await convex.mutation(api.users.updateSubscription, {
    stackUserId: user.stackUserId,
    subscriptionStatus: 'active',
  });

  console.log(`Subscription ${data.id} resumed for user ${user._id}`);
}

async function handleSubscriptionCanceled(data: Record<string, unknown>) {
  const customerId = data.customerId as string;

  const user = await convex.query(api.users.getUserByPaddleCustomerId, { 
    paddleCustomerId: customerId 
  });

  if (!user) {
    console.error(`User not found for Paddle customer ${customerId}`);
    return;
  }

  await convex.mutation(api.users.updateSubscription, {
    stackUserId: user.stackUserId,
    subscriptionStatus: 'canceled',
    projectLimit: FREE_PROJECT_LIMIT,
  });

  console.log(`Subscription ${data.id} canceled for user ${user._id}`);
}

async function handleTransactionCompleted(data: Record<string, unknown>) {
  console.log(`Transaction ${data.id} completed for customer ${data.customerId}`);
}

async function handleInvoicePaid(data: Record<string, unknown>) {
  const customerId = data.customerId as string;
  const subscriptionId = data.subscriptionId as string | undefined;

  console.log(`Invoice ${data.id} paid for subscription ${subscriptionId}`);

  if (subscriptionId) {
    const user = await convex.query(api.users.getUserByPaddleCustomerId, { 
      paddleCustomerId: customerId 
    });

    if (user) {
      // Only update to 'active' if user is not currently in trial or past_due
      // This prevents overwriting legitimate 'trialing' status
      const currentStatus = user.subscriptionStatus;
      if (currentStatus !== 'trialing') {
        await convex.mutation(api.users.updateSubscription, {
          stackUserId: user.stackUserId,
          subscriptionStatus: 'active',
        });
      }
    }
  }
}

function getTierFromPriceId(priceId?: string): 'pro_monthly' | 'pro_yearly' | 'free' {
  if (!priceId) return 'free';
  return PRICE_ID_TO_TIER[priceId] || 'free';
}

function calculateTrialEnd(currentBillingPeriod?: { startsAt: string; endsAt: string }): number | undefined {
  if (!currentBillingPeriod) return undefined;
  
  const trialEnd = new Date(currentBillingPeriod.endsAt);
  return trialEnd.getTime();
}
