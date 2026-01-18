"use client";

import { cn } from "@/lib/utils";

interface StreamingIndicatorProps {
  className?: string;
}

export function StreamingIndicator({ className }: StreamingIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span className="size-1.5 rounded-full bg-current animate-pulse" style={{ animationDelay: "0ms" }} />
      <span className="size-1.5 rounded-full bg-current animate-pulse" style={{ animationDelay: "150ms" }} />
      <span className="size-1.5 rounded-full bg-current animate-pulse" style={{ animationDelay: "300ms" }} />
    </div>
  );
}
