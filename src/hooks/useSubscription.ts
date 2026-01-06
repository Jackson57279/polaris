import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

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
