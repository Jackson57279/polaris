"use client";

import { RefreshCwIcon, ExternalLinkIcon, LoaderIcon } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { useWebContainer } from "../context";

interface PreviewFrameProps {
  className?: string;
}

export function PreviewFrame({ className }: PreviewFrameProps) {
  const { serverUrl, isBooting, error } = useWebContainer();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleRefresh = () => {
    if (iframeRef.current && serverUrl) {
      iframeRef.current.src = serverUrl;
    }
  };

  const handleOpenExternal = () => {
    if (serverUrl) {
      window.open(serverUrl, "_blank");
    }
  };

  if (error) {
    return (
      <div className={`flex items-center justify-center h-full bg-background ${className}`}>
        <div className="text-center text-destructive">
          <p className="font-medium">Preview unavailable</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  if (isBooting) {
    return (
      <div className={`flex items-center justify-center h-full bg-background ${className}`}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <LoaderIcon className="size-4 animate-spin" />
          <span>Starting container...</span>
        </div>
      </div>
    );
  }

  if (!serverUrl) {
    return (
      <div className={`flex items-center justify-center h-full bg-background ${className}`}>
        <div className="text-center text-muted-foreground">
          <p className="font-medium">No server running</p>
          <p className="text-sm">Run a dev server in the terminal to see a preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="flex items-center justify-between px-2 py-1 border-b bg-sidebar">
        <div className="flex items-center gap-2 text-xs text-muted-foreground truncate flex-1">
          <span className="truncate">{serverUrl}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon-xs" variant="ghost" onClick={handleRefresh}>
            <RefreshCwIcon className="size-3" />
          </Button>
          <Button size="icon-xs" variant="ghost" onClick={handleOpenExternal}>
            <ExternalLinkIcon className="size-3" />
          </Button>
        </div>
      </div>
      <iframe
        ref={iframeRef}
        src={serverUrl}
        className="flex-1 w-full border-0 bg-white"
        title="Preview"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
      />
    </div>
  );
}
