"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@stackframe/stack";
import { Check, Sparkles, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type BillingInterval = "monthly" | "yearly";

interface PricingTier {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  projects: string;
  features: string[];
  popular?: boolean;
  cta: string;
  tier?: "pro_monthly" | "pro_yearly";
}

const tiers: PricingTier[] = [
  {
    id: "free",
    name: "Free",
    description: "Perfect for trying out Polaris",
    priceMonthly: 0,
    priceYearly: 0,
    projects: "10 projects",
    features: [
      "10 projects maximum",
      "AI-powered code suggestions",
      "Real-time collaboration",
      "WebContainer execution",
      "Code conversation assistant",
      "Basic GitHub integration",
      "Community support",
    ],
    cta: "Get Started",
  },
  {
    id: "pro-monthly",
    name: "Pro",
    description: "For professional developers",
    priceMonthly: 29,
    priceYearly: 29,
    projects: "Unlimited projects",
    features: [
      "Unlimited projects",
      "Advanced AI features",
      "Priority support",
      "Custom AI models",
      "Advanced GitHub integration",
      "Team collaboration tools",
      "Extended execution time",
      "Private project sharing",
    ],
    popular: true,
    cta: "Start Free Trial",
    tier: "pro_monthly",
  },
  {
    id: "pro-yearly",
    name: "Pro",
    description: "Save 17% with yearly billing",
    priceMonthly: 24.17,
    priceYearly: 290,
    projects: "Unlimited projects",
    features: [
      "Unlimited projects",
      "Advanced AI features",
      "Priority support",
      "Custom AI models",
      "Advanced GitHub integration",
      "Team collaboration tools",
      "Extended execution time",
      "Private project sharing",
      "2 months free",
    ],
    cta: "Start Free Trial",
    tier: "pro_yearly",
  },
];

export function PricingContent() {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly");
  const [loading, setLoading] = useState<string | null>(null);
  const user = useUser();

  const displayTiers = billingInterval === "monthly" 
    ? tiers.filter(t => t.id !== "pro-yearly")
    : tiers.filter(t => t.id !== "pro-monthly");

  const handleCheckout = async (tier?: "pro_monthly" | "pro_yearly") => {
    if (!tier) {
      window.location.href = "/";
      return;
    }

    if (!user) {
      window.location.href = "/handler/sign-in?after=/pricing";
      return;
    }

    setLoading(tier);

    try {
      const response = await fetch("/api/autumn/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout");
      }

      const data = await response.json();
      
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Failed to start checkout. Please try again.");
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="size-6 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight">Pricing</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the perfect plan for your development needs. Start free and upgrade anytime.
          </p>
        </div>

        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center gap-2 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setBillingInterval("monthly")}
              className={cn(
                "px-6 py-2 rounded-md text-sm font-medium transition-all",
                billingInterval === "monthly"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval("yearly")}
              className={cn(
                "px-6 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                billingInterval === "yearly"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Yearly
              <Badge variant="secondary" className="text-xs">
                Save 17%
              </Badge>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {displayTiers.map((tier) => (
            <Card
              key={tier.id}
              className={cn(
                "relative transition-all hover:shadow-lg",
                tier.popular && "border-primary shadow-md scale-105"
              )}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="shadow-lg">
                    <Zap className="size-3" />
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader>
                <CardTitle className="text-2xl">{tier.name}</CardTitle>
                <CardDescription>{tier.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">
                      ${billingInterval === "yearly" ? tier.priceYearly : tier.priceMonthly}
                    </span>
                    <span className="text-muted-foreground">
                      /{billingInterval === "yearly" ? "year" : "month"}
                    </span>
                  </div>
                  {billingInterval === "yearly" && tier.priceYearly > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      ${tier.priceMonthly.toFixed(2)}/month billed yearly
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="font-semibold text-sm">{tier.projects}</p>
                </div>

                <ul className="space-y-3">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="size-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  onClick={() => handleCheckout(tier.tier)}
                  disabled={loading !== null}
                  className="w-full"
                  variant={tier.popular ? "default" : "outline"}
                  size="lg"
                >
                  {loading === tier.tier ? (
                    "Redirecting..."
                  ) : (
                    <>
                      {tier.cta}
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            All plans include a 14-day free trial. No credit card required.
          </p>
          <div className="flex justify-center gap-6 text-sm">
            <Link href="/docs/faq" className="text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </Link>
            <Link href="/docs/features" className="text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
              Contact Sales
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
