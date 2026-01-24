'use client';

import { useState } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CrownIcon, Loader2Icon, SparklesIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckIcon } from 'lucide-react';

export function PricingCard() {
  const { subscription, isLoading } = useSubscription();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  const handleUpgrade = async (tier: 'pro_monthly' | 'pro_yearly') => {
    setIsProcessing(true);
    
    try {
      const response = await fetch('/api/paddle/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          useTrial: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout');
      }

      const { checkoutUrl } = await response.json();
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-64">
        <CardContent className="p-4 flex items-center justify-center">
          <Loader2Icon className="w-4 h-4 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const isPro = subscription?.subscriptionTier === 'pro_monthly' || subscription?.subscriptionTier === 'pro_yearly';
  const isFree = !isPro;

  return (
    <>
      <Card className="w-64 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              {isPro ? (
                <>
                  <CrownIcon className="w-4 h-4 text-yellow-500" />
                  Pro Plan
                </>
              ) : (
                <>
                  <SparklesIcon className="w-4 h-4" />
                  Free Plan
                </>
              )}
            </CardTitle>
            <Badge variant={isPro ? "default" : "secondary"} className="text-xs">
              {subscription?.isInTrial ? 'Trial' : isPro ? 'Active' : 'Free'}
            </Badge>
          </div>
          {isFree && (
            <CardDescription className="text-xs">
              10 projects limit
            </CardDescription>
          )}
          {subscription?.isInTrial && (
            <CardDescription className="text-xs text-blue-600 dark:text-blue-400">
              {subscription.trialDaysRemaining} days left in trial
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="pb-4">
          {isFree ? (
            <Button 
              onClick={() => setShowDialog(true)}
              className="w-full"
              size="sm"
            >
              Upgrade to Pro
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                ✓ Unlimited projects
              </div>
              <div className="text-xs text-muted-foreground">
                ✓ Priority AI access
              </div>
              <div className="text-xs text-muted-foreground">
                ✓ Advanced features
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Upgrade to Pro</DialogTitle>
            <DialogDescription>
              Choose the plan that works best for you. Start with a 7-day free trial.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Pro Monthly</CardTitle>
                <CardDescription className="text-2xl font-bold">
                  $29<span className="text-sm font-normal text-muted-foreground">/month</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm">
                    <CheckIcon className="w-4 h-4 text-green-600" />
                    Unlimited projects
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckIcon className="w-4 h-4 text-green-600" />
                    Priority AI processing
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckIcon className="w-4 h-4 text-green-600" />
                    Advanced collaboration
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckIcon className="w-4 h-4 text-green-600" />
                    WebContainer execution
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckIcon className="w-4 h-4 text-green-600" />
                    Priority support
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckIcon className="w-4 h-4 text-green-600" />
                    7-day free trial
                  </li>
                </ul>
                <Button 
                  onClick={() => handleUpgrade('pro_monthly')} 
                  disabled={isProcessing}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Start Free Trial'
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Pro Yearly</CardTitle>
                  <Badge variant="secondary">Save 17%</Badge>
                </div>
                <CardDescription className="text-2xl font-bold">
                  $290<span className="text-sm font-normal text-muted-foreground">/year</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm">
                    <CheckIcon className="w-4 h-4 text-green-600" />
                    Everything in Monthly
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckIcon className="w-4 h-4 text-green-600" />
                    2 months free
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckIcon className="w-4 h-4 text-green-600" />
                    Annual billing
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckIcon className="w-4 h-4 text-green-600" />
                    Early feature access
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckIcon className="w-4 h-4 text-green-600" />
                    Priority support
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckIcon className="w-4 h-4 text-green-600" />
                    7-day free trial
                  </li>
                </ul>
                <Button 
                  onClick={() => handleUpgrade('pro_yearly')} 
                  disabled={isProcessing}
                  className="w-full"
                  variant="default"
                >
                  {isProcessing ? (
                    <>
                      <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Start Free Trial'
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
