"use client";

import { useState } from "react";
import ky from "ky";
import { toast } from "sonner";
import { FaGithub } from "react-icons/fa";
import { LoaderIcon, ExternalLink } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface GitHubConnectPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected?: () => void;
}

export function GitHubConnectPrompt({
  open,
  onOpenChange,
  onConnected,
}: GitHubConnectPromptProps) {
  const [isChecking, setIsChecking] = useState(false);

  const handleConnect = () => {
    window.open("/handler/account-settings", "_blank");
  };

  const handleCheckConnection = async () => {
    setIsChecking(true);
    try {
      const status = await ky.get("/api/github/status").json<{
        connected: boolean;
        username?: string;
      }>();

      if (status.connected) {
        toast.success(`Connected to GitHub as ${status.username}`);
        onConnected?.();
        onOpenChange(false);
      } else {
        toast.error("GitHub account not connected yet");
      }
    } catch (error) {
      toast.error("Failed to check connection status");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FaGithub className="size-5" />
            Connect GitHub Account
          </DialogTitle>
          <DialogDescription>
            Connect your GitHub account to export projects and access other features.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
            <p>
              To enable GitHub integration, you need to link your GitHub account in your profile settings.
            </p>
          </div>
          
          <Button 
            variant="outline" 
            className="w-full gap-2" 
            onClick={handleConnect}
          >
            <FaGithub className="size-4" />
            Open Account Settings
            <ExternalLink className="size-3 ml-auto opacity-50" />
          </Button>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isChecking}
          >
            Cancel
          </Button>
          <Button onClick={handleCheckConnection} disabled={isChecking}>
            {isChecking ? (
              <>
                <LoaderIcon className="size-4 animate-spin mr-2" />
                Checking...
              </>
            ) : (
              "Check Connection"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
