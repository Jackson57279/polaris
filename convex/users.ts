/**
 * User Subscription Management
 * Handles user creation, subscription tracking, and limits
 */

import { mutation, query } from './_generated/server';
import { verifyAuth } from './auth';
import { v } from 'convex/values';

const FREE_PROJECT_LIMIT = 10;
const TRIAL_DAYS = 7;

export { FREE_PROJECT_LIMIT, TRIAL_DAYS };

/**
 * Get or create user record
 * Called automatically when users sign up/sign in
 */
export const getOrCreateUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await verifyAuth(ctx);
    const stackUserId = identity.subject;
    const email = identity.email || '';
    const now = Date.now();

    // Check if user exists
    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_stack_user', (q) => q.eq('stackUserId', stackUserId))
      .first();

    if (existingUser) {
      // Update last seen
      await ctx.db.patch(existingUser._id, {
        updatedAt: now,
      });
      return existingUser;
    }

    // Create new user with free tier (10 projects)
    const userId = await ctx.db.insert('users', {
      stackUserId,
      email,
      subscriptionStatus: 'free',
      subscriptionTier: 'free',
      projectLimit: FREE_PROJECT_LIMIT,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(userId);
  },
});

/**
 * Get current user's subscription info
 */
export const getSubscription = query({
  args: {},
  handler: async (ctx) => {
    const identity = await verifyAuth(ctx);

    const user = await ctx.db
      .query('users')
      .withIndex('by_stack_user', (q) => q.eq('stackUserId', identity.subject))
      .first();

    if (!user) {
      return null;
    }

    // Calculate trial status
    const trialDaysRemaining = user.trialEndsAt 
      ? Math.max(0, Math.ceil((user.trialEndsAt - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0;
    
    const isInTrial = trialDaysRemaining > 0;

    return {
      ...user,
      trialDaysRemaining,
      isInTrial,
      isPro: user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing',
      isFree: user.subscriptionStatus === 'free',
      canCreateProject: isInTrial || user.subscriptionStatus === 'active' || 
        user.subscriptionStatus === 'trialing' || user.projectLimit === -1,
    };
  },
});

/**
 * Get project count for user
 */
export const getProjectCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await verifyAuth(ctx);

    const user = await ctx.db
      .query('users')
      .withIndex('by_stack_user', (q) => q.eq('stackUserId', identity.subject))
      .first();

    if (!user) {
      return 0;
    }

    // Count projects (using ownerId which is Clerk ID)
    const projects = await ctx.db
      .query('projects')
      .withIndex('by_owner', (q) => q.eq('ownerId', identity.subject))
      .collect();

    return projects.length;
  },
});

/**
 * Update user subscription from Autumn sync
 */
export const updateSubscription = mutation({
  args: {
    stackUserId: v.string(),
    autumnCustomerId: v.optional(v.string()),
    subscriptionStatus: v.optional(v.string()),
    subscriptionTier: v.optional(v.string()),
    subscriptionPlanId: v.optional(v.string()),
    trialEndsAt: v.optional(v.number()),
    projectLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_stack_user', (q) => q.eq('stackUserId', args.stackUserId))
      .first();

    if (!user) {
      throw new Error('User not found');
    }

    const updateData: {
      updatedAt: number;
      autumnCustomerId?: string;
      subscriptionStatus?: string;
      subscriptionTier?: string;
      subscriptionPlanId?: string;
      trialEndsAt?: number;
      projectLimit?: number;
    } = {
      updatedAt: Date.now(),
    };

    if (args.autumnCustomerId !== undefined) {
      updateData.autumnCustomerId = args.autumnCustomerId;
    }
    if (args.subscriptionStatus !== undefined) {
      updateData.subscriptionStatus = args.subscriptionStatus;
    }
    if (args.subscriptionTier !== undefined) {
      updateData.subscriptionTier = args.subscriptionTier;
    }
    if (args.subscriptionPlanId !== undefined) {
      updateData.subscriptionPlanId = args.subscriptionPlanId;
    }
    if (args.trialEndsAt !== undefined) {
      updateData.trialEndsAt = args.trialEndsAt;
    }
    if (args.projectLimit !== undefined) {
      updateData.projectLimit = args.projectLimit;
    }

    await ctx.db.patch(user._id, updateData);

    return await ctx.db.get(user._id);
  },
});

/**
 * Start trial for user
 */
export const startTrial = mutation({
  args: {
    tier: v.union(v.literal('pro_monthly'), v.literal('pro_yearly')),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);
    const now = Date.now();
    const trialEndsAt = now + (TRIAL_DAYS * 24 * 60 * 60 * 1000);

    const user = await ctx.db
      .query('users')
      .withIndex('by_stack_user', (q) => q.eq('stackUserId', identity.subject))
      .first();

    if (!user) {
      throw new Error('User not found');
    }

    // Only start trial if not already in trial or active
    if (user.subscriptionStatus === 'trialing' || user.subscriptionStatus === 'active') {
      throw new Error('User already has an active subscription or trial');
    }

    await ctx.db.patch(user._id, {
      subscriptionStatus: 'trialing',
      subscriptionTier: args.tier,
      trialEndsAt,
      projectLimit: -1, // Unlimited during trial
      updatedAt: now,
    });

    return { success: true, trialEndsAt };
  },
});

/**
 * Cancel trial
 */
export const cancelTrial = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await verifyAuth(ctx);

    const user = await ctx.db
      .query('users')
      .withIndex('by_stack_user', (q) => q.eq('stackUserId', identity.subject))
      .first();

    if (!user) {
      throw new Error('User not found');
    }

    if (user.subscriptionStatus !== 'trialing') {
      throw new Error('User is not in trial');
    }

    await ctx.db.patch(user._id, {
      subscriptionStatus: 'free',
      subscriptionTier: 'free',
      trialEndsAt: undefined,
      projectLimit: FREE_PROJECT_LIMIT,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Sync user data from Clerk
 */
export const syncUserFromClerk = mutation({
  args: {
    stackUserId: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_stack_user', (q) => q.eq('stackUserId', args.stackUserId))
      .first();

    if (!user) {
      // Create new user
      const now = Date.now();
      await ctx.db.insert('users', {
        stackUserId: args.stackUserId,
        email: args.email,
        subscriptionStatus: 'free',
        subscriptionTier: 'free',
        projectLimit: FREE_PROJECT_LIMIT,
        createdAt: now,
        updatedAt: now,
      });
      return { created: true };
    }

    // Update email if changed
    if (user.email !== args.email) {
      await ctx.db.patch(user._id, {
        email: args.email,
        updatedAt: Date.now(),
      });
    }

    return { created: false };
  },
});

/**
 * Get billing status for user
 */
export const getBillingStatus = query({
  args: {},
  handler: async (ctx) => {
    const identity = await verifyAuth(ctx);

    const user = await ctx.db
      .query('users')
      .withIndex('by_stack_user', (q) => q.eq('stackUserId', identity.subject))
      .first();

    if (!user) {
      return null;
    }

    const projectCount = await ctx.db
      .query('projects')
      .withIndex('by_owner', (q) => q.eq('ownerId', identity.subject))
      .collect();

    return {
      subscriptionStatus: user.subscriptionStatus,
      subscriptionTier: user.subscriptionTier,
      trialEndsAt: user.trialEndsAt,
      trialDaysRemaining: user.trialEndsAt 
        ? Math.max(0, Math.ceil((user.trialEndsAt - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0,
      projectLimit: user.projectLimit,
      projectCount: projectCount.length,
      remainingProjects: user.projectLimit === -1 ? 'unlimited' : user.projectLimit - projectCount.length,
      autumnCustomerId: user.autumnCustomerId,
      createdAt: user.createdAt,
    };
  },
});

/**
 * Get user by Clerk ID
 */
export const getUserByStackUserId = query({
  args: { stackUserId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_stack_user', (q) => q.eq('stackUserId', args.stackUserId))
      .first();

    return user;
  },
});

/**
 * Get user by Autumn Customer ID
 */
export const getUserByAutumnCustomerId = query({
  args: { autumnCustomerId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_autumn_customer', (q) => q.eq('autumnCustomerId', args.autumnCustomerId))
      .first();

    return user;
  },
});
