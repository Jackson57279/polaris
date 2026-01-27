"use client";

import { useState, useRef } from "react";
import ky, { HTTPError } from "ky";
import { toast } from "sonner";
import { UploadIcon, LoaderIcon, FileArchiveIcon, XIcon } from "lucide-react";

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

interface ProjectImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: (projectId: string) => void;
}

export function ProjectImportDialog({
  open,
  onOpenChange,
  onImportComplete,
}: ProjectImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [projectName, setProjectName] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".zip")) {
        toast.error("Please select a ZIP file");
        return;
      }
      setFile(selectedFile);
      setProjectName(selectedFile.name.replace(".zip", ""));
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Please select a file to import");
      return;
    }

    if (!projectName.trim()) {
      toast.error("Please enter a project name");
      return;
    }

    setIsImporting(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectName", projectName);

      const response = await ky
        .post("/api/projects/import-zip", {
          body: formData,
        })
        .json<{ success: boolean; projectId: string }>();

      toast.success("Project imported successfully!");
      onOpenChange(false);
      setFile(null);
      setProjectName("");

      if (onImportComplete && response.projectId) {
        onImportComplete(response.projectId);
      }
    } catch (error) {
      if (error instanceof HTTPError) {
        const body = await error.response.json();
        toast.error(body.error || "Failed to import project");
      } else {
        toast.error("Failed to import project");
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setProjectName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileArchiveIcon className="size-5" />
            Import Project
          </DialogTitle>
          <DialogDescription>
            Import a project from a ZIP file. The ZIP will be extracted and all
            files will be added to the new project.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="file">ZIP File</Label>
            {!file ? (
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 cursor-pointer transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadIcon className="size-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium">Click to upload</p>
                <p className="text-xs text-muted-foreground">ZIP files only</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  id="file"
                  accept=".zip"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <FileArchiveIcon className="size-4" />
                  <div className="text-sm">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleRemoveFile}
                  type="button"
                >
                  <XIcon className="size-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="projectName">Project Name</Label>
            <Input
              id="projectName"
              placeholder="My Project"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
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
          <Button onClick={handleImport} disabled={!file || isImporting}>
            {isImporting ? (
              <>
                <LoaderIcon className="size-4 animate-spin mr-2" />
                Importing...
              </>
            ) : (
              <>
                <UploadIcon className="size-4 mr-2" />
                Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
