"use client";

import { LoaderIcon, SparklesIcon, CheckIcon, AlertCircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type AIStatus = "idle" | "thinking" | "streaming" | "completed" | "error";

interface AIStatusIndicatorProps {
  status: AIStatus;
  className?: string;
}

export function AIStatusIndicator({ status, className }: AIStatusIndicatorProps) {
  if (status === "idle" || status === "completed") {
    return null;
  }

  const getStatusContent = () => {
    switch (status) {
      case "thinking":
        return {
          icon: <LoaderIcon className="size-4 animate-spin" />,
          text: "AI is thinking...",
          className: "text-blue-500",
        };
      case "streaming":
        return {
          icon: <SparklesIcon className="size-4" />,
          text: "Generating response...",
          className: "text-purple-500 animate-pulse",
        };
      case "error":
        return {
          icon: <AlertCircleIcon className="size-4" />,
          text: "Error - try again",
          className: "text-red-500",
        };
      default:
        return null;
    }
  };

  const content = getStatusContent();
  if (!content) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm py-1.5 px-3 rounded-md bg-muted/50",
        content.className,
        className
      )}
    >
      {content.icon}
      <span>{content.text}</span>
    </div>
  );
}

interface CompletionIndicatorProps {
  onDismiss?: () => void;
  className?: string;
}

export function CompletionIndicator({ onDismiss, className }: CompletionIndicatorProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm py-1.5 px-3 rounded-md bg-green-500/10 text-green-600 animate-in fade-in duration-200",
        className
      )}
    >
      <CheckIcon className="size-4" />
      <span>Complete</span>
    </div>
  );
}
