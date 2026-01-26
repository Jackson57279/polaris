import type { Metadata } from "next";
import { PricingContent } from "./pricing-content";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Choose the perfect plan for your development needs. Start free and upgrade anytime to unlock unlimited projects and advanced features.",
  openGraph: {
    title: "Polaris IDE Pricing",
    description: "Flexible pricing plans for developers. Start with 10 free projects or upgrade to Pro for unlimited projects and advanced AI features.",
  },
};

export default function PricingPage() {
  return <PricingContent />;
}
