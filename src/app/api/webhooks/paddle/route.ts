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

/**
 * Populate the PRICE_ID_TO_TIER mapping using Paddle price IDs from environment variables.
 *
 * Reads the following environment variables and maps each present price ID to the corresponding
 * subscription tier: `PADDLE_SANDBOX_MONTHLY_PRICE_ID` → `pro_monthly`, `PADDLE_SANDBOX_YEARLY_PRICE_ID` → `pro_yearly`,
 * `NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID` → `pro_monthly`, and `NEXT_PUBLIC_PADDLE_PRO_YEARLY_PRICE_ID` → `pro_yearly`.
 * Missing environment variables are skipped.
 */
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

/**
 * Handle incoming Paddle webhook requests by verifying the signature and dispatching the event to the webhook processor.
 *
 * @param request - The Next.js request containing the Paddle webhook body and `paddle-signature` header
 * @returns A `NextResponse` with:
 * - `200` and message "Webhook processed" when the event is verified and handled successfully.
 * - `400` and message "Missing signature" when the `paddle-signature` header is absent.
 * - `500` and message "Webhook secret not configured" when the webhook secret is not set.
 * - `500` and message "Webhook processing failed" when verification or handling throws an error.
 */
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

/**
 * Dispatches a Paddle webhook event to the appropriate handler based on its `eventType`.
 *
 * Routes supported event types to their corresponding handlers:
 * - customer.created
 * - subscription.created, subscription.activated
 * - subscription.trialing
 * - subscription.trial_completed
 * - subscription.trial_canceled
 * - subscription.updated
 * - subscription.paused
 * - subscription.resumed
 * - subscription.canceled
 * - transaction.completed
 * - invoice.paid
 *
 * @param event - The Paddle webhook event payload with `eventType` and associated `data`
 */
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

/**
 * Processes a Paddle `customer.created` event and links the Paddle customer ID to a Clerk user when present.
 *
 * If `data.customData.clerkUserId` exists and a matching user is found, updates that user's subscription record with the Paddle customer ID.
 *
 * @param data - The Paddle webhook event payload; expected to include `id` (Paddle customer ID) and optionally `customData.clerkUserId`
 */
async function handleCustomerCreated(data: Record<string, unknown>) {
  const customData = data.customData as Record<string, string> | undefined;
  
  if (customData?.clerkUserId) {
    const user = await convex.query(api.users.getUserByClerkId, { 
      clerkId: customData.clerkUserId 
    });

    if (user) {
      await convex.mutation(api.users.updateSubscription, {
        clerkId: customData.clerkUserId,
        paddleCustomerId: data.id as string,
      });
      console.log(`Linked user ${user._id} to Paddle customer ${data.id}`);
    }
  }
}

/**
 * Handle a Paddle "subscription.created" event by linking the Paddle subscription to the matching user and updating that user's subscription record.
 *
 * Expects `data` to contain at least the Paddle customer identifier and subscription fields; when a matching user is found this will update their subscription status, tier, plan id, trial end time, and project limit.
 *
 * @param data - Event payload. Relevant properties:
 *   - `customerId`: Paddle customer id used to find the user.
 *   - `id`: Paddle subscription id to store on the user.
 *   - `status`: Subscription status from the event.
 *   - `items` (optional): Array whose first element may contain `price.id` to determine the subscription tier and plan id.
 *   - `currentBillingPeriod` (optional): Object with `endsAt` (ISO string) used to compute `trialEndsAt`.
 */
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
    clerkId: user.clerkId,
    paddleSubscriptionId: data.id as string,
    subscriptionStatus: data.status as string,
    subscriptionTier: tier,
    subscriptionPlanId: items?.[0]?.price?.id,
    trialEndsAt,
    projectLimit: -1,
  });

  console.log(`Subscription ${data.id} created for user ${user._id}`);
}

/**
 * Marks the linked user subscription as 'trialing' and sets the trial end date based on the Paddle payload.
 *
 * If a user cannot be found for the Paddle customer, no update is performed.
 *
 * @param data - Paddle webhook payload containing `customerId`, `id` (Paddle subscription id), and optional `currentBillingPeriod` with `endsAt`
 */
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
    clerkId: user.clerkId,
    paddleSubscriptionId: data.id as string,
    subscriptionStatus: 'trialing',
    trialEndsAt,
    projectLimit: -1,
  });

  console.log(`Trial started for user ${user._id}, ends at ${trialEndsAt ? new Date(trialEndsAt).toISOString() : 'unknown'}`);
}

/**
 * Marks a user's subscription as active when their Paddle trial completes.
 *
 * Looks up the user by Paddle customer ID from `data.customerId`; if found, sets the user's `subscriptionStatus` to `'active'`. If no user is found, logs an error and returns without making changes.
 *
 * @param data - Webhook payload containing `customerId` (Paddle customer ID)
 */
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
    clerkId: user.clerkId,
    subscriptionStatus: 'active',
  });

  console.log(`Trial completed for user ${user._id}, subscription now active`);
}

/**
 * Handle a canceled trial webhook from Paddle and revert the associated user to the free tier.
 *
 * Updates the matched user's subscription state to `free`, sets the tier to `free`, clears `trialEndsAt`,
 * and enforces the configured free project limit. If no matching user is found for the Paddle customer ID,
 * the function logs an error and returns without making changes.
 *
 * @param data - Paddle webhook payload; must include `customerId` (the Paddle customer identifier)
 */
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
    clerkId: user.clerkId,
    subscriptionStatus: 'free',
    subscriptionTier: 'free',
    trialEndsAt: undefined,
    projectLimit: FREE_PROJECT_LIMIT,
  });

  console.log(`Trial canceled for user ${user._id}, reverted to free tier`);
}

/**
 * Update a user's subscription record in the database from a Paddle `subscription.updated` webhook payload.
 *
 * Looks up the user by Paddle customer ID and updates subscription fields (subscription id, status, tier, plan id).
 * If no matching user is found, the function logs an error and returns without making changes.
 *
 * @param data - Paddle webhook event payload. Expected keys include `customerId`, `id`, `status`, and optional `items` where `items[0].price.id` may determine the subscription tier.
 */
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
    clerkId: user.clerkId,
    paddleSubscriptionId: data.id as string,
    subscriptionStatus: data.status as string,
    subscriptionTier: tier,
    subscriptionPlanId: items?.[0]?.price?.id,
  });

  console.log(`Subscription ${data.id} updated for user ${user._id}`);
}

/**
 * Handle a Paddle `subscription.paused` webhook by marking the corresponding user's subscription as paused.
 *
 * Looks up the user by `data.customerId`; if found, updates that user's `subscriptionStatus` to `"paused"` and logs the action. If no matching user exists, logs an error and takes no further action.
 *
 * @param data - Paddle webhook event payload; expected to include `customerId` (Paddle customer identifier) and `id` (Paddle event or subscription id) for logging
 */
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
    clerkId: user.clerkId,
    subscriptionStatus: 'paused',
  });

  console.log(`Subscription ${data.id} paused for user ${user._id}`);
}

/**
 * Sets a user's subscription status to active when a Paddle subscription is resumed.
 *
 * If a user with the Paddle `customerId` exists, updates that user's `subscriptionStatus` to `'active'` and logs the resume event.
 *
 * @param data - Webhook payload for the resumed subscription; expects `customerId` (Paddle customer ID) and may include `id` used for logging.
 */
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
    clerkId: user.clerkId,
    subscriptionStatus: 'active',
  });

  console.log(`Subscription ${data.id} resumed for user ${user._id}`);
}

/**
 * Handle a Paddle "subscription.canceled" event by marking the linked user's subscription as canceled and reverting their project limit to the free-tier limit.
 *
 * @param data - Paddle webhook payload; must include `customerId` (Paddle customer identifier) and may include `id` (Paddle event id) used for logging.
 */
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
    clerkId: user.clerkId,
    subscriptionStatus: 'canceled',
    projectLimit: FREE_PROJECT_LIMIT,
  });

  console.log(`Subscription ${data.id} canceled for user ${user._id}`);
}

/**
 * Log that a Paddle transaction completed for a customer.
 *
 * @param data - Event payload containing transaction details. Expected keys: `id` (transaction identifier) and `customerId` (Paddle customer identifier)
 */
async function handleTransactionCompleted(data: Record<string, unknown>) {
  console.log(`Transaction ${data.id} completed for customer ${data.customerId}`);
}

/**
 * Handles a Paddle "invoice.paid" event and activates the related subscription when appropriate.
 *
 * If the invoice references a subscription, finds the user by Paddle customer ID and sets their
 * subscription status to `active` unless the user is currently `trialing`.
 *
 * @param data - Paddle invoice payload; expects `customerId` (string), optional `subscriptionId` (string),
 *               and `id` (invoice identifier) for logging.
 */
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
          clerkId: user.clerkId,
          subscriptionStatus: 'active',
        });
      }
    }
  }
}

/**
 * Determines the subscription tier corresponding to a Paddle price ID.
 *
 * @param priceId - Paddle price identifier
 * @returns `pro_monthly` or `pro_yearly` when `priceId` maps to a known tier, `free` otherwise
 */
function getTierFromPriceId(priceId?: string): 'pro_monthly' | 'pro_yearly' | 'free' {
  if (!priceId) return 'free';
  return PRICE_ID_TO_TIER[priceId] || 'free';
}

/**
 * Compute the trial end time from a billing period object.
 *
 * @param currentBillingPeriod - Billing period containing `startsAt` and `endsAt` ISO 8601 datetime strings.
 * @returns The trial end as a Unix timestamp in milliseconds, or `undefined` if `currentBillingPeriod` is not provided.
 */
function calculateTrialEnd(currentBillingPeriod?: { startsAt: string; endsAt: string }): number | undefined {
  if (!currentBillingPeriod) return undefined;
  
  const trialEnd = new Date(currentBillingPeriod.endsAt);
  return trialEnd.getTime();
}