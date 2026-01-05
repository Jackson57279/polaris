"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ky, { HTTPError } from "ky";
import { toast } from "sonner";
import { FaGithub } from "react-icons/fa";
import { LoaderIcon } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface GitHubImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GitHubImportDialog({
  open,
  onOpenChange,
}: GitHubImportDialogProps) {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    if (!repoUrl) return;

    setIsImporting(true);

    try {
      const response = await ky
        .post("/api/github/import", {
          json: { repoUrl },
        })
        .json<{ success: boolean; projectId: string }>();

      toast.success("Repository imported successfully!");
      onOpenChange(false);
      setRepoUrl("");
      router.push(`/projects/${response.projectId}`);
    } catch (error) {
      if (error instanceof HTTPError) {
        const body = await error.response.json();
        toast.error(body.error || "Failed to import repository");
      } else {
        toast.error("Failed to import repository");
      }
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FaGithub className="size-5" />
            Import from GitHub
          </DialogTitle>
          <DialogDescription>
            Enter a GitHub repository URL to import it as a new project.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="repoUrl">Repository URL</Label>
            <Input
              id="repoUrl"
              placeholder="https://github.com/owner/repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              disabled={isImporting}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isImporting}
          >
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!repoUrl || isImporting}>
            {isImporting ? (
              <>
                <LoaderIcon className="size-4 animate-spin mr-2" />
                Importing...
              </>
            ) : (
              "Import"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
