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

/**
 * Initialize and cache the Paddle SDK using the provided client token and environment.
 *
 * @param config - Paddle initialization settings: `clientToken` for authentication and `environment` set to `'sandbox'` or `'production'`
 * @returns The initialized Paddle instance (cached after the first successful initialization)
 */
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

/**
 * Retrieve the cached Paddle instance.
 *
 * @returns The cached Paddle instance, or `null` if Paddle has not been initialized.
 */
export function getPaddleInstance(): unknown {
  return paddleInstance;
}

/**
 * Open the Paddle checkout flow with the provided options.
 *
 * @param options - Checkout configuration including `items`, optional `customer`, optional `settings`, and optional `customData`
 * @throws Error - If Paddle has not been initialized (`Paddle not initialized. Call initializePaddle() first.`)
 * @throws Error - If the Paddle `Checkout` module is not available (`Paddle checkout not available`)
 */
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

/**
 * Opens a Paddle checkout preconfigured for a trial subscription.
 *
 * @param trialPriceId - Price ID to use for the trial item.
 * @param originalPriceId - Price ID of the original (non-trial) product included in the checkout's custom data.
 * @param email - Optional customer email to prefill the checkout form.
 * @throws If Paddle has not been initialized via `initializePaddle`.
 * @throws If the initialized Paddle instance does not expose a `Checkout` API.
 */
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

/**
 * Update the current Paddle checkout's items to a single entry with the given price and quantity.
 *
 * If the Paddle Checkout `updateItems` method is unavailable, the call is a no-op.
 *
 * @param priceId - The Paddle price identifier to set in the checkout
 * @param quantity - The quantity for `priceId`; defaults to `1`
 * @throws Error if Paddle has not been initialized via `initializePaddle()`
 */
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

/**
 * Compute whole days remaining until the provided trial end timestamp.
 *
 * @param trialEndsAt - Epoch timestamp in milliseconds when the trial ends; may be `null` or `undefined`
 * @returns The number of days remaining (rounded up to the next whole day). Returns `0` if `trialEndsAt` is `null`, `undefined`, or in the past.
 */
export function getTrialDaysRemaining(trialEndsAt: number | null | undefined): number {
  if (!trialEndsAt) return 0;
  
  const now = Date.now();
  const diff = trialEndsAt - now;
  
  if (diff <= 0) return 0;
  
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Determine whether the current time is within the trial period.
 *
 * @param trialEndsAt - Unix timestamp in milliseconds when the trial ends, or `null`/`undefined` if no trial
 * @returns `true` if the current time is strictly before `trialEndsAt`, `false` otherwise
 */
export function isInTrialPeriod(trialEndsAt: number | null | undefined): boolean {
  const daysRemaining = getTrialDaysRemaining(trialEndsAt);
  return daysRemaining > 0;
}