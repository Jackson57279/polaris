"use client";

import { useState } from "react";
import ky, { HTTPError } from "ky";
import { toast } from "sonner";
import { DownloadIcon, LoaderIcon, FileArchiveIcon } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ProjectExportDialogProps {
  projectId: Id<"projects">;
  projectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectExportDialog({
  projectId,
  projectName,
  open,
  onOpenChange,
}: ProjectExportDialogProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const response = await ky.post("/api/projects/export-download", {
        json: { projectId },
        responseType: "blob",
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectName}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

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
            <FileArchiveIcon className="size-5" />
            Export Project
          </DialogTitle>
          <DialogDescription>
            Export this project as a ZIP file. All files will be included in the
            download.
          </DialogDescription>
        </DialogHeader>
        <div className="py-6">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="rounded-full bg-muted p-4">
              <FileArchiveIcon className="size-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">{projectName}.zip</p>
              <p className="text-sm text-muted-foreground">
                All project files will be downloaded
              </p>
            </div>
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
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <LoaderIcon className="size-4 animate-spin mr-2" />
                Exporting...
              </>
            ) : (
              <>
                <DownloadIcon className="size-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
