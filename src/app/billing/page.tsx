import type { Metadata } from "next";
import { BillingContent } from "./billing-content";

export const metadata: Metadata = {
  title: "Billing",
  description: "Manage your Polaris subscription and billing settings.",
};

export default function BillingPage() {
  return <BillingContent />;
}
