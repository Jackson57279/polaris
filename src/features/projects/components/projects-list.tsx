import Link from "next/link";
import { FaGithub } from "react-icons/fa";
import { formatDistanceToNow } from "date-fns";
import { AlertCircleIcon, ArrowRightIcon, GlobeIcon, Loader2Icon, DownloadIcon, ImagePlusIcon } from "lucide-react";

import { Kbd } from "@/components/ui/kbd";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";

import { Doc } from "../../../../convex/_generated/dataModel";

import { useProjectsPartial } from "../hooks/use-projects";

const formatTimestamp = (timestamp: number) => {
  return formatDistanceToNow(new Date(timestamp), { 
    addSuffix: true
  });
};

const getProjectIcon = (project: Doc<"projects">) => {
  if (project.importStatus === "completed") {
    return <FaGithub className="size-3.5 text-muted-foreground" />
  }

  if (project.importStatus === "failed") {
    return <AlertCircleIcon className="size-3.5 text-muted-foreground" />;
  }

  if (project.importStatus === "importing") {
    return (
      <Loader2Icon className="size-3.5 text-muted-foreground animate-spin" />
    );
  }

  return <GlobeIcon className="size-3.5 text-muted-foreground" />;
}

interface ProjectsListProps {
  onViewAll: () => void;
  onExport?: (projectId: string, projectName: string) => void;
  onImageUpload?: (projectId: string) => void;
}

const ContinueCard = ({
  data,
  onExport,
  onImageUpload
}: {
  data: Doc<"projects">;
  onExport?: (projectId: string, projectName: string) => void;
  onImageUpload?: (projectId: string) => void;
}) => {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-muted-foreground">
        Last updated
      </span>
      <Button
        variant="outline"
        asChild
        className="h-auto items-start justify-start p-4 bg-background border rounded-none flex flex-col gap-2"
      >
        <Link href={`/projects/${data._id}`} className="group">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {getProjectIcon(data)}
              <span className="font-medium truncate">
                {data.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {onExport && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-6"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onExport(data._id, data.name);
                  }}
                >
                  <DownloadIcon className="size-3.5" />
                </Button>
              )}
              {onImageUpload && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-6"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onImageUpload(data._id);
                  }}
                >
                  <ImagePlusIcon className="size-3.5" />
                </Button>
              )}
              <ArrowRightIcon className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
          <span className="text-xs text-muted-foreground">
            {formatTimestamp(data.updatedAt)}
          </span>
        </Link>
      </Button>
    </div>
  )
};

const ProjectItem = ({
  data,
  onExport,
  onImageUpload
}: {
  data: Doc<"projects">;
  onExport?: (projectId: string, projectName: string) => void;
  onImageUpload?: (projectId: string) => void;
}) => {
  return (
    <div className="flex items-center justify-between w-full group">
      <Link
        href={`/projects/${data._id}`}
        className="text-sm text-foreground/60 font-medium hover:text-foreground py-1 flex items-center gap-2 flex-1 min-w-0"
      >
        {getProjectIcon(data)}
        <span className="truncate">{data.name}</span>
      </Link>
      <div className="flex items-center gap-1">
        {onExport && (
          <Button
            size="icon"
            variant="ghost"
            className="size-6"
            onClick={(e) => {
              e.preventDefault();
              onExport(data._id, data.name);
            }}
          >
            <DownloadIcon className="size-3" />
          </Button>
        )}
        {onImageUpload && (
          <Button
            size="icon"
            variant="ghost"
            className="size-6"
            onClick={(e) => {
              e.preventDefault();
              onImageUpload(data._id);
            }}
          >
            <ImagePlusIcon className="size-3" />
          </Button>
        )}
      </div>
    </div>
  );
};

export const ProjectsList = ({
  onViewAll,
  onExport,
  onImageUpload
}: ProjectsListProps) => {
  const projects = useProjectsPartial(6);

  if (projects === undefined) {
    return <Spinner className="size-4 text-ring" />
  }

  const [mostRecent, ...rest] = projects;

  return (
    <div className="flex flex-col gap-4">
      {mostRecent ? (
        <ContinueCard
          data={mostRecent}
          onExport={onExport}
          onImageUpload={onImageUpload}
        />
      ) : null}
      {rest.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              Recent projects
            </span>
            <button
              onClick={onViewAll}
              className="flex items-center gap-2 text-muted-foreground text-xs hover:text-foreground transition-colors"
            >
              <span>View all</span>
              <Kbd className="bg-accent border">
                ⌘K
              </Kbd>
            </button>
          </div>
          <ul className="flex flex-col">
            {rest.map((project) => (
              <ProjectItem
                key={project._id}
                data={project}
                onExport={onExport}
                onImageUpload={onImageUpload}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
};
