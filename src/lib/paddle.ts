/**
 * Paddle Frontend Integration
 * Checkout flow wrapper for Paddle.js
 */

let paddleInstance: unknown = null;
let PaddleConstructor: unknown = null;

interface PaddleConfig {
  clientToken: string;
  environment: 'sandbox' | 'production';
}

interface CheckoutItem {
  priceId: string;
  quantity: number;
}

interface CheckoutSettings {
  displayMode?: 'overlay' | 'inline' | 'redirect';
  theme?: 'light' | 'dark';
  locale?: string;
  successUrl?: string;
}

interface CheckoutCustomer {
  id?: string;
  email?: string;
}

interface CheckoutOptions {
  items: CheckoutItem[];
  customer?: CheckoutCustomer;
  settings?: CheckoutSettings;
  customData?: Record<string, string>;
}

export async function initializePaddle(config: PaddleConfig): Promise<unknown> {
  if (!paddleInstance) {
    const paddleModule = await import('@paddle/paddle-js');
    PaddleConstructor = paddleModule.default;
    
    paddleInstance = await (PaddleConstructor as { initialize(options: { token: string; environment: string }): Promise<unknown> }).initialize({
      token: config.clientToken,
      environment: config.environment,
    });
  }
  
  return paddleInstance;
}

export function getPaddleInstance(): unknown {
  return paddleInstance;
}

export async function openCheckout(options: CheckoutOptions): Promise<void> {
  const paddle = getPaddleInstance();
  if (!paddle) {
    throw new Error('Paddle not initialized. Call initializePaddle() first.');
  }

  const checkout = (paddle as { Checkout?: { open(input: CheckoutOptions): void } }).Checkout;
  if (!checkout) {
    throw new Error('Paddle checkout not available');
  }

  checkout.open(options);
}

export async function openTrialCheckout(
  trialPriceId: string, 
  originalPriceId: string,
  email?: string
): Promise<void> {
  const paddle = getPaddleInstance();
  if (!paddle) {
    throw new Error('Paddle not initialized. Call initializePaddle() first.');
  }

  const checkout = (paddle as { Checkout?: { open(input: CheckoutOptions): void } }).Checkout;
  if (!checkout) {
    throw new Error('Paddle checkout not available');
  }

  checkout.open({
    items: [{ priceId: trialPriceId, quantity: 1 }],
    customer: email ? { email } : undefined,
    settings: {
      displayMode: 'overlay',
      theme: 'light',
      locale: 'en',
    },
    customData: {
      isTrial: 'true',
      originalPriceId,
    },
  });
}

export function updateCheckoutItems(priceId: string, quantity: number = 1): void {
  const paddle = getPaddleInstance();
  if (!paddle) {
    throw new Error('Paddle not initialized. Call initializePaddle() first.');
  }

  const checkout = (paddle as { Checkout?: { updateItems(items: CheckoutItem[]): void } }).Checkout;
  if (checkout?.updateItems) {
    checkout.updateItems([{ priceId, quantity }]);
  }
}

export function getTrialDaysRemaining(trialEndsAt: number | null | undefined): number {
  if (!trialEndsAt) return 0;
  
  const now = Date.now();
  const diff = trialEndsAt - now;
  
  if (diff <= 0) return 0;
  
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function isInTrialPeriod(trialEndsAt: number | null | undefined): boolean {
  const daysRemaining = getTrialDaysRemaining(trialEndsAt);
  return daysRemaining > 0;
}
