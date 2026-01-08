import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

/**
 * Exposes the current user's subscription and billing status derived from Convex queries.
 *
 * @returns An object containing:
 * - `subscription` — the raw subscription data from `api.users.getSubscription` (or `undefined` while loading)
 * - `billingStatus` — the raw billing status data from `api.users.getBillingStatus` (or `undefined` while loading)
 * - `isLoading` — `true` if either `subscription` or `billingStatus` is `undefined`, `false` otherwise
 * - `isPro` — `true` if the subscription indicates a Pro account, `false` otherwise
 * - `isInTrial` — `true` if the subscription indicates an active trial, `false` otherwise
 * - `trialDaysRemaining` — the number of trial days remaining (defaults to `0` if absent)
 * - `projectLimit` — the allowed number of projects (defaults to `10` if absent)
 * - `projectCount` — the current number of projects (defaults to `0` if absent)
 * - `remainingProjects` — the remaining project slots (defaults to `10` if absent)
 */
export function useSubscription() {
  const subscription = useQuery(api.users.getSubscription);
  const billingStatus = useQuery(api.users.getBillingStatus);

  return {
    subscription,
    billingStatus,
    isLoading: subscription === undefined || billingStatus === undefined,
    isPro: subscription?.isPro ?? false,
    isInTrial: subscription?.isInTrial ?? false,
    trialDaysRemaining: subscription?.trialDaysRemaining ?? 0,
    projectLimit: billingStatus?.projectLimit ?? 10,
    projectCount: billingStatus?.projectCount ?? 0,
    remainingProjects: billingStatus?.remainingProjects ?? 10,
  };
}