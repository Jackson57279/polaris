'use client';

import { useState } from 'react';
import { useSubscription } from '@/hooks/useSubscription';

interface PricingPlan {
  name: string;
  tier: 'free' | 'pro_monthly' | 'pro_yearly';
  price: number;
  productId: string;
  interval: 'month' | 'year';
  features: string[];
  popular?: boolean;
}

const plans: PricingPlan[] = [
  {
    name: 'Free',
    tier: 'free',
    price: 0,
    productId: '',
    interval: 'month',
    features: [
      '10 projects',
      'Basic code editing',
      'AI suggestions',
      'Community support',
    ],
  },
  {
    name: 'Pro Monthly',
    tier: 'pro_monthly',
    price: 29,
    productId: process.env.NEXT_PUBLIC_AUTUMN_PRO_MONTHLY_PRODUCT_ID || '',
    interval: 'month',
    features: [
      'Unlimited projects',
      'Full AI agent access',
      'WebContainer execution',
      'GitHub integration',
      'Priority support',
      'Team collaboration',
    ],
    popular: true,
  },
  {
    name: 'Pro Yearly',
    tier: 'pro_yearly',
    price: 290,
    productId: process.env.NEXT_PUBLIC_AUTUMN_PRO_YEARLY_PRODUCT_ID || '',
    interval: 'year',
    features: [
      'Everything in Pro Monthly',
      '2 months free',
      'Annual billing',
      'Early access to new features',
    ],
  },
];

export function PricingPlans() {
  const { subscription, isLoading } = useSubscription();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const handleSubscribe = async (plan: PricingPlan) => {
    if (!plan.productId) return;
    
    setIsProcessing(plan.tier);
    
    try {
      const response = await fetch('/api/autumn/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: plan.tier,
          useTrial: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout');
      }

      const { checkoutUrl } = await response.json();
      if (!checkoutUrl) {
        await fetch('/api/autumn/sync', { method: 'POST' });
        setIsProcessing(null);
        return;
      }
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setIsProcessing(null);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-lg p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-4" />
            <div className="h-10 bg-gray-200 rounded mb-4" />
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {plans.map((plan) => {
        const isCurrentPlan = 
          plan.tier === 'free' 
            ? subscription?.subscriptionTier === 'free' && !subscription?.isInTrial
            : subscription?.subscriptionTier === plan.tier;

        return (
          <div
            key={plan.tier}
            className={`border rounded-lg p-6 relative ${
              plan.popular ? 'border-blue-500 shadow-lg' : ''
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-3 py-1 text-sm rounded-full">
                Most Popular
              </div>
            )}

            <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
            
            <div className="mb-4">
              <span className="text-4xl font-bold">${plan.price}</span>
              {plan.price > 0 && (
                <span className="text-gray-500">/{plan.interval}</span>
              )}
            </div>

            {subscription?.isInTrial && plan.tier !== 'free' && (
              <div className="mb-4 p-2 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
                {subscription.trialDaysRemaining} days left in trial
              </div>
            )}

            <ul className="space-y-2 mb-6">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>

            {isCurrentPlan ? (
              <button
                disabled
                className="w-full py-2 bg-green-500 text-white rounded cursor-not-allowed"
              >
                Current Plan
              </button>
            ) : plan.productId ? (
              <button
                onClick={() => handleSubscribe(plan)}
                disabled={isProcessing === plan.tier}
                className={`w-full py-2 rounded transition-colors ${
                  plan.popular
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                } disabled:opacity-50`}
              >
                {isProcessing === plan.tier
                  ? 'Processing...'
                  : subscription?.isInTrial
                    ? 'Upgrade Now'
                    : 'Get Started'}
              </button>
            ) : (
              <button
                disabled
                className="w-full py-2 bg-gray-200 text-gray-500 rounded cursor-not-allowed"
              >
                Included
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
