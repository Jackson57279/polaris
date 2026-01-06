/**
 * Paddle Server-Side Integration
 * API calls to Paddle Billing
 */

import { Paddle, Environment } from '@paddle/paddle-node-sdk';

const paddle = new Paddle(
  process.env.PADDLE_API_KEY || '',
  {
    environment: process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === 'sandbox' ? Environment.sandbox : Environment.production,
  }
);

export { paddle };

interface CustomerData {
  email: string;
  name?: string;
  customData?: Record<string, string>;
}

export const paddleCustomers = {
  async create(data: CustomerData) {
    return await paddle.customers.create(data);
  },

  async get(customerId: string) {
    return await paddle.customers.get(customerId);
  },

  async update(customerId: string, data: { email?: string; name?: string }) {
    return await paddle.customers.update(customerId, data);
  },
};

interface CheckoutItem {
  priceId: string;
  quantity: number;
}

interface CheckoutData {
  items: CheckoutItem[];
  customer?: { email?: string; id?: string };
  customData?: Record<string, string>;
  settings?: {
    displayMode?: 'overlay' | 'inline' | 'redirect';
    theme?: 'light' | 'dark';
    successUrl?: string;
    cancelUrl?: string;
    locale?: string;
  };
  discountCode?: string;
}

export const paddleCheckout = {
  async create(data: CheckoutData) {
    return await (paddle as unknown as { checkout: { create(data: CheckoutData): Promise<unknown> } }).checkout.create(data);
  },

  async get(checkoutId: string) {
    return await (paddle as unknown as { checkout: { get(id: string): Promise<unknown> } }).checkout.get(checkoutId);
  },
};

interface SubscriptionItem {
  priceId: string;
  quantity: number;
}

interface SubscriptionData {
  customerId: string;
  items: SubscriptionItem[];
  startDate?: string;
  prorationBillingDate?: string;
  effectiveDate?: string;
  customData?: Record<string, string>;
  discountId?: string;
  collectionMode?: 'manual' | 'automatic';
  billingCycle?: { interval: 'day' | 'week' | 'month' | 'year'; frequency: number };
}

export const paddleSubscriptions = {
  async create(data: SubscriptionData) {
    return await (paddle as unknown as { subscriptions: { create(data: SubscriptionData): Promise<unknown> } }).subscriptions.create(data);
  },

  async get(subscriptionId: string) {
    return await (paddle as unknown as { subscriptions: { get(id: string): Promise<unknown> } }).subscriptions.get(subscriptionId);
  },

  async update(subscriptionId: string, data: {
    items: SubscriptionItem[];
    prorationBillingMode?: 'prorated_immediately' | 'prorated_next_billing_period' | 'full_immediately' | 'full_next_billing_period';
    effectiveDate?: string;
  }) {
    return await (paddle as unknown as { subscriptions: { update(id: string, data: unknown): Promise<unknown> } }).subscriptions.update(subscriptionId, data);
  },

  async pause(subscriptionId: string, effectiveDate?: string) {
    return await (paddle as unknown as { subscriptions: { pause(id: string, data?: { effectiveDate: string }): Promise<unknown> } }).subscriptions.pause(subscriptionId, effectiveDate ? { effectiveDate } : undefined);
  },

  async resume(subscriptionId: string, options?: { effectiveDate?: string; billImmediately?: boolean }) {
    return await (paddle as unknown as { subscriptions: { resume(id: string, options?: { effectiveDate?: string; billImmediately?: boolean }): Promise<unknown> } }).subscriptions.resume(subscriptionId, options);
  },

  async cancel(subscriptionId: string, effectiveDate?: string) {
    return await (paddle as unknown as { subscriptions: { cancel(id: string, options?: { effectiveDate: string }): Promise<unknown> } }).subscriptions.cancel(subscriptionId, effectiveDate ? { effectiveDate } : undefined);
  },
};

export const paddlePrices = {
  async get(priceId: string) {
    return await (paddle as unknown as { prices: { get(id: string): Promise<unknown> } }).prices.get(priceId);
  },
};

export const paddleProducts = {
  async get(productId: string) {
    return await (paddle as unknown as { products: { get(id: string): Promise<unknown> } }).products.get(productId);
  },
};

interface DiscountData {
  code: string;
  type: 'percentage' | 'flat';
  amount: string;
  description: string;
  currencyCode?: 'USD' | 'EUR' | 'GBP';
  duration?: 'one_time' | 'repeating' | 'forever';
  durationInNumber?: number;
  maxRedemptions?: number;
  expiresAt?: string;
  productIds?: string[];
  priceIds?: string[];
}

export const paddleDiscounts = {
  async create(data: DiscountData) {
    return await (paddle as unknown as { discounts: { create(data: DiscountData): Promise<unknown> } }).discounts.create(data);
  },

  async get(discountId: string) {
    return await (paddle as unknown as { discounts: { get(id: string): Promise<unknown> } }).discounts.get(discountId);
  },

  async update(discountId: string, data: { code?: string; maxRedemptions?: number; expiresAt?: string }) {
    return await (paddle as unknown as { discounts: { update(id: string, data: unknown): Promise<unknown> } }).discounts.update(discountId, data);
  },
};

export const paddleCustomerPortal = {
  async createSession(customerId: string, returnUrl?: string) {
    return await (paddle as unknown as { customerPortal: { createSession(data: { customerId: string; returnUrl?: string }): Promise<unknown> } }).customerPortal.createSession({ customerId, returnUrl });
  },
};

export const paddleTransactions = {
  async get(transactionId: string) {
    return await (paddle as unknown as { transactions: { get(id: string): Promise<unknown> } }).transactions.get(transactionId);
  },
};

export type PaddleEventType = 
  | 'business.created'
  | 'business.updated'
  | 'checkout.created'
  | 'checkout.completed'
  | 'customer.created'
  | 'customer.updated'
  | 'discount.created'
  | 'discount.updated'
  | 'discount.voided'
  | 'address.created'
  | 'address.updated'
  | 'transaction.created'
  | 'transaction.completed'
  | 'transaction.canceled'
  | 'transaction.payment_failed'
  | 'subscription.created'
  | 'subscription.activated'
  | 'subscription.canceled'
  | 'subscription.paused'
  | 'subscription.resumed'
  | 'subscription.updated'
  | 'subscription.trialing'
  | 'subscription.trial_completed'
  | 'subscription.trial_canceled'
  | 'invoice.created'
  | 'invoice.paid'
  | 'invoice.payment_failed';

export interface PaddleWebhookEvent {
  eventType: PaddleEventType;
  data: Record<string, unknown>;
  occurredAt: string;
  id: string;
}

export function verifyWebhook(
  body: string,
  signature: string,
  secret: string
): PaddleWebhookEvent {
  return paddle.webhooks.unmarshal(body, secret, signature) as unknown as PaddleWebhookEvent;
}

export function formatPrice(amount: string, currencyCode: string = 'USD'): string {
  const numericAmount = parseInt(amount) / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(numericAmount);
}

export function getPriceIdForTier(
  tier: 'pro_monthly' | 'pro_yearly',
  environment: 'sandbox' | 'production'
): string {
  if (environment === 'sandbox') {
    return tier === 'pro_monthly' 
      ? process.env.PADDLE_SANDBOX_MONTHLY_PRICE_ID || ''
      : process.env.PADDLE_SANDBOX_YEARLY_PRICE_ID || '';
  }
  
  return tier === 'pro_monthly'
    ? process.env.NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID || ''
    : process.env.NEXT_PUBLIC_PADDLE_PRO_YEARLY_PRICE_ID || '';
}
