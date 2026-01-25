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
    throw result.error;
  }
  return result.data;
}
