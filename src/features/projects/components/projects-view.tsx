"use client";

import { Poppins } from "next/font/google";
import { SparkleIcon, DownloadIcon, UploadIcon, ImagePlusIcon } from "lucide-react";
import { FaGithub } from "react-icons/fa";
import {
  adjectives,
  animals,
  colors,
  uniqueNamesGenerator,
} from "unique-names-generator";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";

import { ProjectsList } from "./projects-list";
import { ProjectsCommandDialog } from "./projects-command-dialog";
import { GitHubImportDialog } from "./github-import-dialog";
import { AIGenerateDialog } from "./ai-generate-dialog";
import { ProjectUsageBanner } from "./project-usage-banner";
import { ProjectImportDialog } from "./project-import-dialog";
import { ProjectExportDialog } from "./project-export-dialog";
import { ImageUploadDialog } from "./image-upload-dialog";
import { useUser } from "@stackframe/stack";
import { UnauthenticatedView } from "@/features/auth/components/unauthenticated-view";

const font = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

export const ProjectsView = () => {
  const user = useUser();
  const router = useRouter();

  const [commandDialogOpen, setCommandDialogOpen] = useState(false);
  const [githubImportDialogOpen, setGithubImportDialogOpen] = useState(false);
  const [zipImportDialogOpen, setZipImportDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [imageUploadDialogOpen, setImageUploadDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProjectName, setSelectedProjectName] = useState<string>("");

  if (!user) {
    return <UnauthenticatedView />;
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === "k") {
          e.preventDefault();
          setCommandDialogOpen(true);
        }
        if (e.key === "i") {
          e.preventDefault();
          setGithubImportDialogOpen(true);
        }
        if (e.key === "j") {
          e.preventDefault();
          setGenerateDialogOpen(true);
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleExport = (projectId: string, projectName: string) => {
    setSelectedProjectId(projectId);
    setSelectedProjectName(projectName);
    setExportDialogOpen(true);
  };

  const handleImageUpload = (projectId: string) => {
    setSelectedProjectId(projectId);
    setImageUploadDialogOpen(true);
  };

  return (
    <>
      <ProjectsCommandDialog
        open={commandDialogOpen}
        onOpenChange={setCommandDialogOpen}
      />
      <GitHubImportDialog
        open={githubImportDialogOpen}
        onOpenChange={setGithubImportDialogOpen}
      />
      <ProjectImportDialog
        open={zipImportDialogOpen}
        onOpenChange={setZipImportDialogOpen}
        onImportComplete={(projectId) => router.push(`/projects/${projectId}`)}
      />
      <AIGenerateDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
      />
      {selectedProjectId && (
        <>
          <ProjectExportDialog
            projectId={selectedProjectId as any}
            projectName={selectedProjectName}
            open={exportDialogOpen}
            onOpenChange={setExportDialogOpen}
          />
          <ImageUploadDialog
            projectId={selectedProjectId as any}
            open={imageUploadDialogOpen}
            onOpenChange={setImageUploadDialogOpen}
          />
        </>
      )}
      <div className="min-h-screen bg-sidebar flex flex-col items-center justify-center p-6 md:p-16">
        <div className="w-full max-w-sm mx-auto flex flex-col gap-4 items-center">

          <div className="flex justify-between gap-4 w-full items-center">

            <div className="flex items-center gap-2 w-full group/logo">
              <img src="/logo.svg" alt="Polaris" className="size-[32px] md:size-[46px]" />
              <h1 className={cn(
                "text-4xl md:text-5xl font-semibold",
                font.className,
              )}>
                Polaris
              </h1>
            </div>

          </div>

          <div className="flex flex-col gap-4 w-full">
            <ProjectUsageBanner />
            
            <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              onClick={() => setGenerateDialogOpen(true)}
              className="h-full items-start justify-start p-4 bg-background border flex flex-col gap-6 rounded-none"
            >
              <div className="flex items-center justify-between w-full">
                <SparkleIcon className="size-4" />
                <Kbd className="bg-accent border">
                  ⌘J
                </Kbd>
              </div>
              <div>
                <span className="text-sm">
                  Generate
                </span>
              </div>
            </Button>
            <Button
              variant="outline"
              onClick={() => setGithubImportDialogOpen(true)}
              className="h-full items-start justify-start p-4 bg-background border flex flex-col gap-6 rounded-none"
            >
              <div className="flex items-center justify-between w-full">
                <FaGithub className="size-4" />
                <Kbd className="bg-accent border">
                  ⌘I
                </Kbd>
              </div>
              <div>
                <span className="text-sm">
                  GitHub
                </span>
              </div>
            </Button>
            <Button
              variant="outline"
              onClick={() => setZipImportDialogOpen(true)}
              className="h-full items-start justify-start p-4 bg-background border flex flex-col gap-6 rounded-none"
            >
              <div className="flex items-center justify-between w-full">
                <UploadIcon className="size-4" />
                <span className="text-xs text-muted-foreground">
                  ZIP
                </span>
              </div>
              <div>
                <span className="text-sm">
                  Import ZIP
                </span>
              </div>
            </Button>
            </div>

            <ProjectsList
              onViewAll={() => setCommandDialogOpen(true)}
              onExport={handleExport}
              onImageUpload={handleImageUpload}
            />

          </div>

        </div>
      </div>
    </>
  );
};
