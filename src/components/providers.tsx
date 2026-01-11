"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexProvider } from "convex/react";
import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackClientApp } from "@/stack/client";

import { ThemeProvider } from "./theme-provider";
import { Suspense } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Set up Stack Auth for Convex
if (typeof window !== 'undefined') {
  convex.setAuth(stackClientApp.getConvexClientAuth({}));
}

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <StackProvider app={stackClientApp}>
      <ConvexProvider client={convex}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <StackTheme>
            <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
              {children}
            </Suspense>
          </StackTheme>
        </ThemeProvider>
      </ConvexProvider>
    </StackProvider>
  );
};
