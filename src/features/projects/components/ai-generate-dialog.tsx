"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ky, { HTTPError } from "ky";
import { toast } from "sonner";
import { SparklesIcon, LoaderIcon, XIcon } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

interface AIGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface GenerationStatus {
  status: "processing" | "completed" | "failed";
  progress: number;
  currentStep: string;
  events: Array<{
    type: "step" | "file" | "info" | "error";
    message: string;
    filePath?: string;
    preview?: string;
    createdAt: number;
  }>;
}

export function AIGenerateDialog({
  open,
  onOpenChange,
}: AIGenerateDialogProps) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [projectName, setProjectName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  const clearPolling = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  }, [pollingInterval]);

  useEffect(() => {
    return () => {
      clearPolling();
    };
  }, [clearPolling]);

  useEffect(() => {
    if (!open) {
      clearPolling();
      setIsGenerating(false);
      setProjectId(null);
      setGenerationStatus(null);
    }
  }, [open, clearPolling]);

  const pollStatus = useCallback(async (pid: string) => {
    try {
      const status = await ky
        .get(`/api/projects/generate/status/${pid}`)
        .json<GenerationStatus>();

      setGenerationStatus(status);

      if (status.status === "completed") {
        clearPolling();
        toast.success("Project generated successfully!");
        onOpenChange(false);
        setDescription("");
        setProjectName("");
        router.push(`/projects/${pid}`);
      } else if (status.status === "failed") {
        clearPolling();
        setIsGenerating(false);
        toast.error("Project generation failed");
      }
    } catch (error) {
      console.error("Failed to poll status:", error);
    }
  }, [clearPolling, onOpenChange, router]);

  const handleCancel = () => {
    clearPolling();
    setIsGenerating(false);
    setProjectId(null);
    setGenerationStatus(null);
  };

  const handleGenerate = async () => {
    if (!description) return;

    setIsGenerating(true);

    try {
      const response = await ky
        .post("/api/projects/generate", {
          json: { description, projectName: projectName || undefined },
        })
        .json<{ projectId: string; status: string }>();

      setProjectId(response.projectId);

      // Start polling every 2 seconds
      const interval = setInterval(() => {
        pollStatus(response.projectId);
      }, 2000);

      setPollingInterval(interval);

      // Initial poll
      pollStatus(response.projectId);
    } catch (error) {
      setIsGenerating(false);
      if (error instanceof HTTPError) {
        const body = await error.response.json();
        toast.error(body.error || "Failed to generate project");
      } else {
        toast.error("Failed to generate project");
      }
    }
  };

  const getCurrentStepDisplay = () => {
    if (!generationStatus) return "Starting...";
    
    const stepMap: Record<string, string> = {
      "Starting validate-input": "Validating input...",
      "Completed validate-input": "Input validated",
      "Starting generate-config-files": "Generating configuration files...",
      "Completed generate-config-files": "Configuration files created",
      "Starting generate-source-structure": "Generating source structure...",
      "Completed generate-source-structure": "Source structure created",
      "Starting generate-components": "Generating components...",
      "Completed generate-components": "Components created",
      "Starting generate-pages": "Generating pages...",
      "Completed generate-pages": "Pages created",
      "Starting generate-hooks": "Generating hooks...",
      "Completed generate-hooks": "Hooks created",
      "Starting generate-types": "Generating types...",
      "Completed generate-types": "Types created",
      "Starting generate-utilities": "Generating utilities...",
      "Completed generate-utilities": "Utilities created",
      "Starting finalize-readme": "Finalizing README...",
      "Completed finalize-readme": "README created",
      "Starting verify-project": "Verifying project...",
      "Completed verify-project": "Project verified",
    };

    return stepMap[generationStatus.currentStep] || generationStatus.currentStep;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SparklesIcon className="size-5" />
            Generate Project with AI
          </DialogTitle>
          <DialogDescription>
            Describe the project you want to create and AI will generate the initial codebase.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="projectName">Project Name (optional)</Label>
            <Input
              id="projectName"
              placeholder="my-awesome-project"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              disabled={isGenerating}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Project Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the project you want to create. Be specific about the tech stack, features, and functionality..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isGenerating}
              rows={5}
            />
          </div>

          {isGenerating && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{getCurrentStepDisplay()}</span>
                <span className="text-muted-foreground">{generationStatus?.progress ?? 0}%</span>
              </div>
              <Progress value={generationStatus?.progress ?? 0} className="h-2" />
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <LoaderIcon className="size-4 animate-spin" />
                <span>Generating your project...</span>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => isGenerating ? handleCancel() : onOpenChange(false)}
            disabled={false}
          >
            {isGenerating ? (
              <>
                <XIcon className="size-4 mr-1" />
                Cancel
              </>
            ) : (
              "Close"
            )}
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!description || isGenerating}
          >
            {isGenerating ? (
              <>
                <LoaderIcon className="size-4 animate-spin mr-2" />
                Generating...
              </>
            ) : (
              "Generate"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
