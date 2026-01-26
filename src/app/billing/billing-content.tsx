"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubscriptionManager } from "@/components/billing/subscription-manager";
import { useUser } from "@stackframe/stack";
import { UnauthenticatedView } from "@/features/auth/components/unauthenticated-view";

export function BillingContent() {
  const user = useUser();

  if (!user) {
    return <UnauthenticatedView />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="size-4" />
              Back to Projects
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Billing & Subscription</h1>
          <p className="text-muted-foreground">
            Manage your subscription, billing details, and view pricing plans.
          </p>
        </div>

        <SubscriptionManager />

        <div className="mt-8 p-6 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">Need to change your plan?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            View all available pricing plans and features.
          </p>
          <Link href="/pricing">
            <Button variant="outline">View Pricing Plans</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
