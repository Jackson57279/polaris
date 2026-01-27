import { Autumn, type BillingPortalParams, type CheckParams, type CheckoutParams } from 'autumn-js';

let autumnInstance: Autumn | null = null;

function getAutumn(): Autumn {
  if (!autumnInstance) {
    const secretKey = process.env.AUTUMN_SECRET_KEY;
    if (!secretKey) {
      throw new Error('AUTUMN_SECRET_KEY environment variable is required but not set.');
    }

    autumnInstance = new Autumn({
      secretKey,
      url: process.env.AUTUMN_API_URL,
      defaultReturnUrl: process.env.NEXT_PUBLIC_APP_URL,
    });
  }

  return autumnInstance;
}

export async function createCheckout(params: CheckoutParams) {
  const autumn = getAutumn();
  const result = await autumn.checkout(params);
  if (result.error) {
    throw result.error;
  }
  return result.data;
}

export async function openBillingPortal(customerId: string, params?: BillingPortalParams) {
  const autumn = getAutumn();
  const result = await autumn.customers.billingPortal(customerId, params);
  if (result.error) {
    throw result.error;
  }
  return result.data;
}

export async function getCustomer(customerId: string) {
  const autumn = getAutumn();
  const result = await autumn.customers.get(customerId);
  if (result.error) {
    throw result.error;
  }
  return result.data;
}

export async function checkAccess(params: CheckParams) {
  const autumn = getAutumn();
  const result = await autumn.check(params);
  if (result.error) {
    // If the feature isn't configured in Autumn, allow access by default
    if ('code' in result.error && result.error.code === 'feature_not_found') {
      console.warn(`[Autumn] Feature "${params.feature_id}" not configured — allowing access by default.`);
      return { allowed: true, usage: 0, included_usage: 0 };
    }
    throw result.error;
  }
  return result.data;
}

export async function trackUsage(customerId: string, featureId: string, value = 1) {
  const autumn = getAutumn();
  const result = await autumn.track({
    customer_id: customerId,
    feature_id: featureId,
    value,
  });
  if (result.error) {
    if ('code' in result.error && result.error.code === 'feature_not_found') {
      console.warn(`[Autumn] Feature "${featureId}" not configured — skipping usage tracking.`);
      return null;
    }
    throw result.error;
  }
  return result.data;
}
