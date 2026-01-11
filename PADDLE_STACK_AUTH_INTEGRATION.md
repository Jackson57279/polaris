# Paddle + Stack Auth Integration Guide

## Overview

This document explains how Paddle Billing is integrated with Stack Auth in Polaris IDE.

## Architecture

```
User Signs In (Stack Auth)
    ↓
    [Stack Auth provides: user.id as stackUserId]
    ↓
User clicks "Start Trial" → Create Paddle Checkout
    ↓
    [Pass stackUserId in customData]
    ↓
User completes checkout → Paddle sends webhook
    ↓
    [Webhook contains stackUserId in customData]
    ↓
Update Convex user record with subscription status
    ↓
User gets unlimited projects!
```

## Key Integration Points

### 1. Checkout Flow

**File**: `src/app/api/paddle/checkout/route.ts`

```typescript
// Get authenticated user from Stack Auth
const { user, userId } = await requireAuth();

// Create Paddle checkout with Stack user ID
const checkout = await paddleCheckout.create({
  items: [{ priceId, quantity: 1 }],
  customer: { email: user.primaryEmail },
  customData: {
    stackUserId: userId,  // ← Stack Auth user ID
    tier,
    useTrial,
  },
});
```

**Critical**: The `stackUserId` is passed in `customData` and will be returned in all webhook events.

### 2. Webhook Handler

**File**: `src/app/api/webhooks/paddle/route.ts`

```typescript
async function handleCustomerCreated(data) {
  // Extract Stack user ID from custom data
  const stackUserId = customData?.stackUserId;
  
  // Find user in Convex by Stack Auth ID
  const user = await convex.query(api.users.getUserByStackUserId, { 
    stackUserId 
  });
  
  // Link Paddle customer to user
  await convex.mutation(api.users.updateSubscription, {
    stackUserId,
    paddleCustomerId: data.id,
  });
}
```

**Flow**:
1. Paddle sends webhook with event
2. Extract `stackUserId` from `customData`
3. Query Convex user by `stackUserId`
4. Update user with Paddle subscription details

### 3. Convex User Schema

**File**: `convex/schema.ts`

```typescript
users: defineTable({
  stackUserId: v.string(),           // Stack Auth user ID (PRIMARY)
  clerkId: v.optional(v.string()),   // Legacy for migration
  email: v.string(),
  
  // Paddle fields
  paddleCustomerId: v.optional(v.string()),
  paddleSubscriptionId: v.optional(v.string()),
  subscriptionStatus: v.optional(v.union(
    v.literal("free"),
    v.literal("trialing"),
    v.literal("active"),
    v.literal("paused"),
    v.literal("canceled"),
    v.literal("past_due")
  )),
  subscriptionTier: v.optional(v.union(
    v.literal("free"),
    v.literal("pro_monthly"),
    v.literal("pro_yearly")
  )),
  projectLimit: v.number(),  // -1 = unlimited
  trialEndsAt: v.optional(v.number()),
  // ...
})
  .index("by_stack_user", ["stackUserId"])  // Query by Stack Auth ID
  .index("by_paddle_customer", ["paddleCustomerId"])  // Query by Paddle
```

### 4. Subscription Queries

**File**: `convex/users.ts`

```typescript
// Get user by Stack Auth ID (used in webhooks)
export const getUserByStackUserId = query({
  args: { stackUserId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('users')
      .withIndex('by_stack_user', (q) => 
        q.eq('stackUserId', args.stackUserId)
      )
      .first();
  },
});

// Get user by Paddle Customer ID
export const getUserByPaddleCustomerId = query({
  args: { paddleCustomerId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('users')
      .withIndex('by_paddle_customer', (q) => 
        q.eq('paddleCustomerId', args.paddleCustomerId)
      )
      .first();
  },
});

// Update subscription (called from webhooks)
export const updateSubscription = mutation({
  args: {
    stackUserId: v.string(),  // Stack Auth user ID
    paddleCustomerId: v.optional(v.string()),
    subscriptionStatus: v.optional(v.string()),
    // ...
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_stack_user', (q) => 
        q.eq('stackUserId', args.stackUserId)
      )
      .first();
    
    // Update user subscription details
    await ctx.db.patch(user._id, updateData);
  },
});
```

## Webhook Event Flow

### Event: `customer.created`
```typescript
{
  eventType: "customer.created",
  data: {
    id: "ctm_xxx",
    customData: {
      stackUserId: "stack_user_xxx",  // ← From checkout
      tier: "pro_monthly",
      useTrial: "true"
    }
  }
}
```
**Action**: Link Paddle customer ID to user record

### Event: `subscription.trialing`
```typescript
{
  eventType: "subscription.trialing",
  data: {
    id: "sub_xxx",
    customerId: "ctm_xxx",
    status: "trialing",
    currentBillingPeriod: {
      endsAt: "2026-01-17T00:00:00Z"  // 7 days from now
    }
  }
}
```
**Action**: 
- Set `subscriptionStatus: 'trialing'`
- Set `projectLimit: -1` (unlimited)
- Set `trialEndsAt` timestamp

### Event: `subscription.activated` or `subscription.trial_completed`
```typescript
{
  eventType: "subscription.activated",
  data: {
    id: "sub_xxx",
    status: "active"
  }
}
```
**Action**: 
- Set `subscriptionStatus: 'active'`
- Keep `projectLimit: -1`

### Event: `subscription.canceled`
```typescript
{
  eventType: "subscription.canceled",
  data: {
    id: "sub_xxx",
    status: "canceled"
  }
}
```
**Action**: 
- Set `subscriptionStatus: 'canceled'`
- Set `projectLimit: 10` (revert to free)

## User Experience Flow

### 1. New User Signs Up
```
1. User signs up via Stack Auth → stackUserId created
2. Convex creates user record:
   {
     stackUserId: "stack_user_123",
     email: "user@example.com",
     subscriptionStatus: "free",
     projectLimit: 10
   }
3. User sees "Start 7-Day Free Trial" button
```

### 2. User Starts Trial
```
1. Click "Start Trial" → POST /api/paddle/checkout
   Body: { tier: "pro_monthly", useTrial: true }

2. Backend creates Paddle checkout:
   customData: { stackUserId: "stack_user_123", ... }

3. User completes checkout on Paddle

4. Paddle webhook: subscription.trialing
   customData.stackUserId → Find user → Update:
   {
     paddleSubscriptionId: "sub_xxx",
     subscriptionStatus: "trialing",
     projectLimit: -1,
     trialEndsAt: Date.now() + 7 days
   }

5. User can now create unlimited projects!
```

### 3. Trial Converts to Paid
```
1. After 7 days, Paddle charges card

2. Paddle webhook: subscription.trial_completed
   status: "active"

3. Update user:
   {
     subscriptionStatus: "active",
     projectLimit: -1  // Still unlimited
   }

4. User continues with pro features
```

### 4. User Cancels
```
1. User clicks "Manage Billing" → Paddle portal

2. User cancels subscription in portal

3. Paddle webhook: subscription.canceled

4. Update user:
   {
     subscriptionStatus: "canceled",
     projectLimit: 10  // Back to free tier
   }

5. User can keep existing projects but can't create new ones beyond limit
```

## Component Integration

### Subscription Manager Component

**File**: `src/components/billing/subscription-manager.tsx`

```typescript
import { useUser } from "@stackframe/stack";
import { useQuery } from "convex/react";

export function SubscriptionManager() {
  // Get authenticated user from Stack Auth
  const user = useUser();
  
  // Get subscription from Convex
  const subscription = useQuery(api.users.getSubscription);
  
  // Display current status, trial info, upgrade buttons
}
```

**Features**:
- Shows current plan status (Free, Trial, Pro)
- Displays project usage
- Trial countdown
- Upgrade buttons
- Manage billing button (opens Paddle portal)

## Testing Checklist

### Local Testing
- [ ] User signs up with Stack Auth
- [ ] User record created in Convex with `stackUserId`
- [ ] Click "Start Trial" → Redirects to Paddle
- [ ] Complete checkout with test card
- [ ] Webhook received (check logs)
- [ ] User updated with `trialing` status
- [ ] Project limit becomes unlimited
- [ ] Can create multiple projects

### Webhook Testing
Use Paddle's webhook testing tool or ngrok:

```bash
# 1. Expose local server
ngrok http 3000

# 2. Add webhook URL in Paddle dashboard
https://your-ngrok-url.ngrok.io/api/webhooks/paddle

# 3. Trigger test events in Paddle dashboard
```

### Production Testing
- [ ] Environment variables set correctly
- [ ] Webhook URL configured in Paddle
- [ ] Test with Paddle sandbox first
- [ ] Switch to production when ready
- [ ] Monitor webhook logs
- [ ] Test all subscription states

## Debugging

### Check User Record
```typescript
// In Convex dashboard
const user = await ctx.db
  .query('users')
  .withIndex('by_stack_user', (q) => 
    q.eq('stackUserId', 'stack_user_xxx')
  )
  .first();

console.log(user);
// Should show:
// {
//   stackUserId: "stack_user_xxx",
//   paddleCustomerId: "ctm_xxx",
//   subscriptionStatus: "trialing",
//   projectLimit: -1,
//   ...
// }
```

### Webhook Logs
Check console logs for:
```
Processing Paddle webhook: subscription.trialing
Trial started for user xyz_123, ends at 2026-01-17...
```

### Common Issues

**Issue**: Webhook not received
- Check Paddle dashboard → Webhooks → Event log
- Verify webhook URL is correct
- Check webhook secret matches `.env`

**Issue**: User not found in webhook
- Check `customData.stackUserId` is passed correctly
- Verify user exists in Convex
- Check `by_stack_user` index exists

**Issue**: Subscription not updating
- Check webhook signature verification
- Verify Convex mutation is called
- Check for error logs

## Environment Variables

```bash
# Stack Auth
NEXT_PUBLIC_STACK_PROJECT_ID=xxx
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=xxx
STACK_SECRET_SERVER_KEY=xxx

# Paddle
PADDLE_API_KEY=xxx
PADDLE_WEBHOOK_SECRET=xxx
NEXT_PUBLIC_PADDLE_ENVIRONMENT=production  # or "sandbox"

# Price IDs
NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID=pri_xxx
NEXT_PUBLIC_PADDLE_PRO_YEARLY_PRICE_ID=pri_xxx
```

## Migration Notes

If migrating from Clerk:
1. Both `stackUserId` and `clerkId` fields exist during migration
2. Webhooks use `stackUserId` for new subscriptions
3. Old subscriptions still work with Paddle customer ID lookup
4. Can gradually migrate existing Paddle customers to new `stackUserId` field

## Summary

**Key Points**:
1. ✅ Stack Auth provides `stackUserId`
2. ✅ Paddle checkout passes `stackUserId` in `customData`
3. ✅ Webhooks extract `stackUserId` and update Convex
4. ✅ User queries work with both Stack Auth ID and Paddle customer ID
5. ✅ Subscription status controls project limits
6. ✅ Trial gives 7 days of unlimited access
7. ✅ Cancellation reverts to free tier

**The integration is fully functional!** 🎉

All the pieces connect:
- Stack Auth ↔ User Authentication
- Paddle ↔ Payments & Subscriptions
- Convex ↔ User Data & Limits
- React ↔ UI Components

Just configure the environment variables and test!
