"use client";

import { useUser } from "@stackframe/stack";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function SubscriptionManager() {
  const user = useUser();
  const subscription = useQuery(api.users.getSubscription, {});
  const billingStatus = useQuery(api.users.getBillingStatus, {});
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async (tier: 'pro_monthly' | 'pro_yearly', useTrial: boolean = false) => {
    if (!user) {
      toast.error("Please sign in to upgrade");
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/paddle/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, useTrial }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout');
      }

      const { checkoutUrl } = await response.json();
      
      // Open Paddle checkout
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Upgrade error:', error);
      toast.error('Failed to start checkout process');
      setIsLoading(false);
    }
  };

  const handleManageBilling = async () => {
    if (!billingStatus?.paddleCustomerId) {
      toast.error("No billing account found");
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/paddle/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          customerId: billingStatus.paddleCustomerId 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to open billing portal');
      }

      const { portalUrl } = await response.json();
      window.open(portalUrl, '_blank');
    } catch (error) {
      console.error('Billing portal error:', error);
      toast.error('Failed to open billing portal');
    } finally {
      setIsLoading(false);
    }
  };

  if (!subscription || !billingStatus) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2Icon className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const { isFree, isPro, isInTrial, trialDaysRemaining } = subscription;
  const { projectCount, projectLimit, remainingProjects } = billingStatus;

  return (
    <div className="space-y-6">
      {/* Current Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Current Plan</CardTitle>
            <Badge variant={isPro ? "default" : "secondary"}>
              {isInTrial ? 'Trial' : isFree ? 'Free' : 'Pro'}
            </Badge>
          </div>
          <CardDescription>
            {user?.primaryEmail}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm text-muted-foreground">Projects</div>
            <div className="text-2xl font-bold">
              {projectCount} / {projectLimit === -1 ? '∞' : projectLimit}
            </div>
            {typeof remainingProjects === 'number' && remainingProjects <= 3 && (
              <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                Only {remainingProjects} projects remaining
              </p>
            )}
          </div>

          {isInTrial && (
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Trial Active: {trialDaysRemaining} days remaining
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Enjoy unlimited projects during your trial
              </p>
            </div>
          )}

          {subscription.subscriptionStatus === 'past_due' && (
            <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
              <p className="text-sm font-medium text-red-900 dark:text-red-100">
                Payment Failed
              </p>
              <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                Please update your payment method to continue
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter>
          {!isPro ? (
            <Button 
              onClick={() => handleUpgrade('pro_monthly', true)} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Start 7-Day Free Trial'
              )}
            </Button>
          ) : (
            <Button 
              onClick={handleManageBilling} 
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                'Manage Billing'
              )}
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Pricing Cards (only show if free) */}
      {isFree && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Pro Monthly</CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold">$29</span> / month
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Unlimited projects</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Priority AI processing</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Advanced collaboration</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-green-600" />
                  <span className="text-sm">7-day free trial</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => handleUpgrade('pro_monthly', true)} 
                disabled={isLoading}
                className="w-full"
              >
                Start Free Trial
              </Button>
            </CardFooter>
          </Card>

          <Card className="border-2 border-primary">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Pro Yearly</CardTitle>
                <Badge variant="secondary">Save 17%</Badge>
              </div>
              <CardDescription>
                <span className="text-3xl font-bold">$290</span> / year
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Everything in Monthly</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-green-600" />
                  <span className="text-sm">2 months free</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Priority support</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-green-600" />
                  <span className="text-sm">7-day free trial</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => handleUpgrade('pro_yearly', true)} 
                disabled={isLoading}
                className="w-full"
                variant="default"
              >
                Start Free Trial
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
