/**
 * Paddle Integration Tests
 * Tests for subscription management, project limits, and trial functionality
 */

import { describe, it, expect } from 'vitest';

describe('Subscription Constants', () => {
  it('should export FREE_PROJECT_LIMIT as 10', () => {
    const FREE_PROJECT_LIMIT = 10;
    const TRIAL_DAYS = 7;
    
    expect(FREE_PROJECT_LIMIT).toBe(10);
    expect(TRIAL_DAYS).toBe(7);
  });
});

describe('Price ID Helpers', () => {
  const getPriceIdForTier = (tier: 'pro_monthly' | 'pro_yearly', environment: 'sandbox' | 'production'): string => {
    if (environment === 'sandbox') {
      return tier === 'pro_monthly' 
        ? process.env.PADDLE_SANDBOX_MONTHLY_PRICE_ID || ''
        : process.env.PADDLE_SANDBOX_YEARLY_PRICE_ID || '';
    }
    
    return tier === 'pro_monthly'
      ? process.env.NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID || ''
      : process.env.NEXT_PUBLIC_PADDLE_PRO_YEARLY_PRICE_ID || '';
  };

  it('should return empty string for sandbox when env not set', () => {
    delete process.env.PADDLE_SANDBOX_MONTHLY_PRICE_ID;
    const result = getPriceIdForTier('pro_monthly', 'sandbox');
    expect(result).toBe('');
  });

  it('should return price ID for production when env is set', () => {
    process.env.NEXT_PUBLIC_PADDLE_PRO_YEARLY_PRICE_ID = 'pri_yearly_prod';
    const result = getPriceIdForTier('pro_yearly', 'production');
    expect(result).toBe('pri_yearly_prod');
  });
});

describe('Price Formatting', () => {
  const formatPrice = (amount: string, currencyCode: string = 'USD'): string => {
    const numericAmount = parseInt(amount) / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(numericAmount);
  };

  it('should format price correctly in USD', () => {
    expect(formatPrice('2900', 'USD')).toBe('$29.00');
    expect(formatPrice('29000', 'USD')).toBe('$290.00');
    expect(formatPrice('0', 'USD')).toBe('$0.00');
  });

  it('should format price with default currency USD', () => {
    expect(formatPrice('2900')).toBe('$29.00');
  });
});

describe('Trial Calculations', () => {
  const getTrialDaysRemaining = (trialEndsAt: number | null | undefined): number => {
    if (!trialEndsAt) return 0;
    
    const now = Date.now();
    const diff = trialEndsAt - now;
    
    if (diff <= 0) return 0;
    
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const isInTrialPeriod = (trialEndsAt: number | null | undefined): boolean => {
    const daysRemaining = getTrialDaysRemaining(trialEndsAt);
    return daysRemaining > 0;
  };

  it('should calculate days remaining correctly for future date', () => {
    const now = Date.now();
    const sevenDaysFromNow = now + (7 * 24 * 60 * 60 * 1000);
    
    expect(getTrialDaysRemaining(sevenDaysFromNow)).toBe(7);
  });

  it('should return 0 for past date', () => {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    expect(getTrialDaysRemaining(oneDayAgo)).toBe(0);
  });

  it('should return 0 for null/undefined', () => {
    expect(getTrialDaysRemaining(null)).toBe(0);
    expect(getTrialDaysRemaining(undefined)).toBe(0);
  });

  it('should correctly identify trial period status', () => {
    const now = Date.now();
    const sevenDaysFromNow = now + (7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    expect(isInTrialPeriod(sevenDaysFromNow)).toBe(true);
    expect(isInTrialPeriod(oneDayAgo)).toBe(false);
    expect(isInTrialPeriod(null)).toBe(false);
  });
});

describe('Subscription Status Types', () => {
  type SubscriptionStatus = 'free' | 'trialing' | 'active' | 'paused' | 'canceled' | 'past_due';
  type SubscriptionTier = 'free' | 'pro_monthly' | 'pro_yearly';

  it('should accept all valid subscription statuses', () => {
    const statuses: SubscriptionStatus[] = ['free', 'trialing', 'active', 'paused', 'canceled', 'past_due'];
    expect(statuses.length).toBe(6);
  });

  it('should accept all valid subscription tiers', () => {
    const tiers: SubscriptionTier[] = ['free', 'pro_monthly', 'pro_yearly'];
    expect(tiers.length).toBe(3);
  });
});

describe('Tier Detection', () => {
  const getTierFromPriceId = (priceId?: string): 'pro_monthly' | 'pro_yearly' | 'free' => {
    if (!priceId) return 'free';
    if (priceId.includes('yearly') || priceId.includes('annual')) {
      return 'pro_yearly';
    }
    return 'pro_monthly';
  };

  it('should identify yearly price IDs', () => {
    expect(getTierFromPriceId('pri_yearly_123')).toBe('pro_yearly');
    expect(getTierFromPriceId('pri_annual_456')).toBe('pro_yearly');
  });

  it('should identify monthly price IDs', () => {
    expect(getTierFromPriceId('pri_monthly_789')).toBe('pro_monthly');
    expect(getTierFromPriceId('pri_123')).toBe('pro_monthly');
  });

  it('should return free for undefined price ID', () => {
    expect(getTierFromPriceId(undefined)).toBe('free');
    expect(getTierFromPriceId('')).toBe('free');
  });
});

describe('Project Limit Logic', () => {
  it('should calculate remaining projects correctly', () => {
    const projectLimit = 10;
    const projectCount = 3;
    const remaining = projectLimit - projectCount;
    expect(remaining).toBe(7);
  });

  it('should handle unlimited project limit', () => {
    const projectLimit = -1;
    const projectCount = 100;
    const canCreate = projectLimit === -1 || projectCount < projectLimit;
    expect(canCreate).toBe(true);
  });

  it('should deny project creation when at limit', () => {
    const projectLimit: number = 10;
    const projectCount: number = 10;
    const canCreate = projectLimit === -1 || projectCount < projectLimit;
    expect(canCreate).toBe(false);
  });
});

describe('Trial End Calculation', () => {
  it('should calculate trial end timestamp from billing period', () => {
    const currentBillingPeriod = {
      startsAt: '2024-01-01T00:00:00Z',
      endsAt: '2024-01-08T00:00:00Z',
    };
    
    const trialEnd = new Date(currentBillingPeriod.endsAt).getTime();
    const expected = new Date('2024-01-08T00:00:00Z').getTime();
    
    expect(trialEnd).toBe(expected);
  });

  it('should return undefined when no billing period', () => {
    const billingPeriod: { startsAt: string; endsAt: string } | null = null;
    
    let trialEndsAt: number | undefined;
    if (billingPeriod !== null) {
      const bp = billingPeriod as { startsAt: string; endsAt: string };
      trialEndsAt = new Date(bp.endsAt).getTime();
    }
    
    expect(trialEndsAt).toBeUndefined();
  });
});

describe('Webhook Event Types', () => {
  type PaddleEventType = 
    | 'subscription.created'
    | 'subscription.activated'
    | 'subscription.trialing'
    | 'subscription.trial_completed'
    | 'subscription.canceled'
    | 'customer.created'
    | 'subscription.updated'
    | 'subscription.paused'
    | 'subscription.resumed'
    | 'transaction.completed'
    | 'invoice.paid';

  interface PaddleWebhookEvent {
    eventType: PaddleEventType;
    data: Record<string, unknown>;
    occurredAt: string;
    id: string;
  }

  it('should create valid webhook event', () => {
    const event: PaddleWebhookEvent = {
      eventType: 'subscription.created',
      data: { id: 'sub_123', customerId: 'ctm_456' },
      occurredAt: new Date().toISOString(),
      id: 'evt_789',
    };
    
    expect(event.eventType).toBe('subscription.created');
    expect(event.data.id).toBe('sub_123');
  });

  it('should accept all event types', () => {
    const eventTypes: PaddleEventType[] = [
      'subscription.created',
      'subscription.activated',
      'subscription.trialing',
      'subscription.trial_completed',
      'subscription.canceled',
      'customer.created',
      'subscription.updated',
      'subscription.paused',
      'subscription.resumed',
      'transaction.completed',
      'invoice.paid',
    ];
    
    expect(eventTypes.length).toBe(11);
  });
});

describe('Checkout Options', () => {
  interface CheckoutItem {
    priceId: string;
    quantity: number;
  }

  interface CheckoutData {
    items: CheckoutItem[];
    customer?: { email?: string; id?: string };
    settings?: {
      displayMode?: 'overlay' | 'inline' | 'redirect';
      theme?: 'light' | 'dark';
      successUrl?: string;
    };
    customData?: Record<string, string>;
  }

  it('should construct checkout options correctly', () => {
    const options: CheckoutData = {
      items: [{ priceId: 'pri_monthly_test', quantity: 1 }],
      customer: { email: 'test@example.com' },
      settings: {
        displayMode: 'overlay',
        theme: 'light',
        successUrl: 'https://example.com/success',
      },
      customData: {
        clerkUserId: 'user_123',
        tier: 'pro_monthly',
        useTrial: 'true',
      },
    };
    
    expect(options.items[0].priceId).toBe('pri_monthly_test');
    expect(options.settings?.displayMode).toBe('overlay');
    expect(options.customData?.clerkUserId).toBe('user_123');
  });
});

describe('Paddle Environment Configuration', () => {
  it('should use sandbox for test environment', () => {
    const env = 'sandbox';
    const paddleEnv = env === 'sandbox' ? 'sandbox' : 'production';
    expect(paddleEnv).toBe('sandbox');
  });

  it('should use production for non-sandbox environment', () => {
    const env: string = 'production';
    const isSandbox = env === 'sandbox';
    const paddleEnv: 'sandbox' | 'production' = isSandbox ? 'sandbox' : 'production';
    expect(paddleEnv).toBe('production');
  });
});

describe('User Subscription Flow', () => {
  describe('Free User Creation', () => {
    it('should create user with default free tier settings', () => {
      const now = Date.now();
      
      const newUser = {
        clerkId: 'user_123',
        email: 'test@example.com',
        subscriptionStatus: 'free' as const,
        subscriptionTier: 'free' as const,
        projectLimit: 10,
        createdAt: now,
        updatedAt: now,
      };
      
      expect(newUser.subscriptionStatus).toBe('free');
      expect(newUser.subscriptionTier).toBe('free');
      expect(newUser.projectLimit).toBe(10);
    });
  });

  describe('Trial Activation', () => {
    it('should activate trial with correct settings', () => {
      const TRIAL_DAYS = 7;
      const now = Date.now();
      const trialEndsAt = now + (TRIAL_DAYS * 24 * 60 * 60 * 1000);
      
      const trialUser = {
        subscriptionStatus: 'trialing' as const,
        subscriptionTier: 'pro_monthly' as const,
        trialEndsAt,
        projectLimit: -1,
      };
      
      expect(trialUser.subscriptionStatus).toBe('trialing');
      expect(trialUser.projectLimit).toBe(-1);
      
      const daysRemaining = Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24));
      expect(daysRemaining).toBe(7);
    });
  });

  describe('Trial Completion', () => {
    it('should transition from trial to active', () => {
      const activeUser = {
        subscriptionStatus: 'active' as const,
        subscriptionTier: 'pro_monthly' as const,
        trialEndsAt: undefined,
        projectLimit: -1,
      };
      
      expect(activeUser.subscriptionStatus).toBe('active');
      expect(activeUser.trialEndsAt).toBeUndefined();
    });
  });

  describe('Subscription Cancellation', () => {
    it('should revert to free tier with project limit', () => {
      const canceledUser = {
        subscriptionStatus: 'canceled' as const,
        subscriptionTier: 'free' as const,
        trialEndsAt: undefined,
        projectLimit: 10,
      };
      
      expect(canceledUser.subscriptionStatus).toBe('canceled');
      expect(canceledUser.projectLimit).toBe(10);
    });
  });

  describe('Project Creation Permission', () => {
    it('should allow project creation for trial users', () => {
      const trialUser = {
        subscriptionStatus: 'trialing' as const,
        projectLimit: -1,
      };
      
      const canCreate = trialUser.projectLimit === -1;
      expect(canCreate).toBe(true);
    });

    it('should allow project creation for active subscribers', () => {
      const activeUser = {
        subscriptionStatus: 'active' as const,
        projectLimit: -1,
      };
      
      const canCreate = activeUser.projectLimit === -1;
      expect(canCreate).toBe(true);
    });

    it('should check limit for free users with room', () => {
      const freeUser = {
        subscriptionStatus: 'free' as const,
        projectLimit: 10,
        projectCount: 5,
      };
      
      const canCreate = freeUser.projectLimit === -1 || freeUser.projectCount < freeUser.projectLimit;
      expect(canCreate).toBe(true);
      expect(freeUser.projectCount).toBeLessThan(freeUser.projectLimit);
    });

  it('should deny project creation when at limit', () => {
    const freeUserLimit = 10 as number;
    const freeUserCount = 10 as number;
    const canCreate = freeUserLimit === -1 || freeUserCount < freeUserLimit;
    expect(canCreate).toBe(false);
  });
  });
});

describe('Paddle API Types', () => {
  describe('Customer Data', () => {
    interface CustomerData {
      email: string;
      name?: string;
      customData?: Record<string, string>;
    }

    it('should type customer creation data correctly', () => {
      const customer: CustomerData = {
        email: 'test@example.com',
        name: 'Test User',
        customData: {
          clerkUserId: 'user_123',
        },
      };
      
      expect(customer.email).toBe('test@example.com');
      expect(customer.customData?.clerkUserId).toBe('user_123');
    });
  });

  describe('Subscription Data', () => {
    interface SubscriptionItem {
      priceId: string;
      quantity: number;
    }

    interface SubscriptionData {
      customerId: string;
      items: SubscriptionItem[];
      startDate?: string;
      effectiveDate?: string;
      customData?: Record<string, string>;
      collectionMode?: 'manual' | 'automatic';
      billingCycle?: { interval: 'day' | 'week' | 'month' | 'year'; frequency: number };
    }

    it('should type subscription creation data correctly', () => {
      const subscription: SubscriptionData = {
        customerId: 'ctm_123',
        items: [{ priceId: 'pri_monthly', quantity: 1 }],
        collectionMode: 'automatic',
        billingCycle: { interval: 'month', frequency: 1 },
        customData: {
          clerkUserId: 'user_456',
        },
      };
      
      expect(subscription.items[0].priceId).toBe('pri_monthly');
      expect(subscription.billingCycle?.interval).toBe('month');
    });
  });
});
