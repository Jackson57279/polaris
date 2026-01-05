"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ky, { HTTPError } from "ky";
import { toast } from "sonner";
import { SparklesIcon, LoaderIcon } from "lucide-react";

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

interface AIGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIGenerateDialog({
  open,
  onOpenChange,
}: AIGenerateDialogProps) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [projectName, setProjectName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!description) return;

    setIsGenerating(true);

    try {
      const response = await ky
        .post("/api/projects/generate", {
          json: { description, projectName: projectName || undefined },
          timeout: 120000,
        })
        .json<{ success: boolean; projectId: string }>();

      toast.success("Project generated successfully!");
      onOpenChange(false);
      setDescription("");
      setProjectName("");
      router.push(`/projects/${response.projectId}`);
    } catch (error) {
      if (error instanceof HTTPError) {
        const body = await error.response.json();
        toast.error(body.error || "Failed to generate project");
      } else {
        toast.error("Failed to generate project");
      }
    } finally {
      setIsGenerating(false);
    }
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
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Cancel
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
