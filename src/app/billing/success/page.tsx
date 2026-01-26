"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function BillingSuccessPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const syncSubscription = async () => {
      try {
        // Wait 1 second to allow Autumn to process the webhook/payment
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const response = await fetch('/api/autumn/sync', { method: 'POST' });
        
        if (!response.ok) {
          throw new Error('Failed to sync subscription');
        }
        
        setStatus('success');
      } catch (error) {
        console.error('Sync error:', error);
        setStatus('error');
      }
    };

    syncSubscription();
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border shadow-lg animate-in fade-in zoom-in-95 duration-500">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted/50 ring-1 ring-border">
            {status === 'loading' && (
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            )}
            {status === 'success' && (
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-500 animate-in zoom-in duration-300" />
            )}
            {status === 'error' && (
              <AlertCircle className="h-10 w-10 text-destructive animate-in zoom-in duration-300" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            {status === 'loading' && "Finalizing Subscription..."}
            {status === 'success' && "Welcome to Pro!"}
            {status === 'error' && "Something went wrong"}
          </CardTitle>
          <CardDescription className="text-base mt-3 leading-relaxed">
            {status === 'loading' && "Please wait a moment while we confirm your payment details and update your account."}
            {status === 'success' && "Your subscription has been successfully activated. You now have unlimited access to all Pro features."}
            {status === 'error' && "We couldn't verify your subscription status automatically. Please try again or contact support."}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
        </CardContent>
        <CardFooter className="flex flex-col gap-3 pt-0">
          {status === 'success' && (
            <>
              <Link href="/" className="w-full">
                <Button className="w-full font-semibold" size="lg">
                  Start Building <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/billing" className="w-full">
                <Button variant="outline" className="w-full">
                  View Subscription Details
                </Button>
              </Link>
            </>
          )}
          
          {status === 'error' && (
            <Button 
              onClick={() => window.location.reload()} 
              className="w-full"
              size="lg"
            >
              Try Again
            </Button>
          )}
          
          {status === 'loading' && (
             <Button disabled className="w-full opacity-80" variant="ghost">
                Syncing...
             </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
