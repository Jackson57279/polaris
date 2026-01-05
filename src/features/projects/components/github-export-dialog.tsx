"use client";

import { useState } from "react";
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

import { Id } from "../../../../convex/_generated/dataModel";

interface GitHubExportDialogProps {
  projectId: Id<"projects">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GitHubExportDialog({
  projectId,
  open,
  onOpenChange,
}: GitHubExportDialogProps) {
  const [repoUrl, setRepoUrl] = useState("");
  const [commitMessage, setCommitMessage] = useState("Update from Polaris");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!repoUrl) return;

    setIsExporting(true);

    try {
      await ky.post("/api/github/export", {
        json: { projectId, repoUrl, commitMessage },
      });

      toast.success("Project exported successfully!");
      onOpenChange(false);
    } catch (error) {
      if (error instanceof HTTPError) {
        const body = await error.response.json();
        toast.error(body.error || "Failed to export project");
      } else {
        toast.error("Failed to export project");
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FaGithub className="size-5" />
            Export to GitHub
          </DialogTitle>
          <DialogDescription>
            Export this project to an existing GitHub repository.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="exportRepoUrl">Repository URL</Label>
            <Input
              id="exportRepoUrl"
              placeholder="https://github.com/owner/repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              disabled={isExporting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="commitMessage">Commit Message</Label>
            <Input
              id="commitMessage"
              placeholder="Update from Polaris"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              disabled={isExporting}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={!repoUrl || isExporting}>
            {isExporting ? (
              <>
                <LoaderIcon className="size-4 animate-spin mr-2" />
                Exporting...
              </>
            ) : (
              "Export"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
