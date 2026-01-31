import Image from "next/image";
import { useEffect, useRef } from "react";

import { useFile, useUpdateFile } from "@/features/projects/hooks/use-files";

import { CodeEditor } from "./code-editor";
import { useEditor } from "../hooks/use-editor";
import { TopNavigation } from "./top-navigation";
import { FileBreadcrumbs } from "./file-breadcrumbs";
import { Id } from "../../../../convex/_generated/dataModel";

const DEBOUNCE_MS = 1500;

export const EditorView = ({ projectId }: { projectId: Id<"projects"> }) => {
  const { activeTabId } = useEditor(projectId);
  const activeFile = useFile(activeTabId);
  const updateFile = useUpdateFile();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isActiveFileBinary = activeFile && activeFile.storageId;
  const isActiveFileText = activeFile && !activeFile.storageId;

  // Cleanup pending debounced updates on unmount or file change
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [activeTabId]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center">
        <TopNavigation projectId={projectId} />
      </div>
      {activeTabId && <FileBreadcrumbs projectId={projectId} />}
      <div className="flex-1 min-h-0 bg-background flex flex-col">
        <div className="flex-1 min-h-0">
          {!activeFile && (
            <div className="size-full flex items-center justify-center">
              <Image
                src="/logo-alt.svg"
                alt="Polaris"
                width={50}
                height={50}
                className="opacity-25"
              />
            </div>
          )}
          {isActiveFileText && (
            <CodeEditor
              key={activeFile._id}
              fileName={activeFile.name}
              initialValue={activeFile.content}
              onChange={(content: string) => {
                if (timeoutRef.current) {
                  clearTimeout(timeoutRef.current);
                }

                timeoutRef.current = setTimeout(() => {
                  updateFile({ id: activeFile._id, content });
                }, DEBOUNCE_MS);
              }}
            />
            )}
            {isActiveFileBinary && (
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <h3 className="text-lg font-semibold">Binary File</h3>
                </div>
                <p className="text-muted-foreground">
                  This is a binary file that cannot be previewed directly in the editor.
                </p>
                <div className="bg-muted p-4 rounded-lg border border-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <p className="text-sm font-mono">Binary data (storageId: {activeFile?.storageId})</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    onClick={() => {
                      // TODO: Add download functionality
                    }}
                  >
                    Download File
                  </button>
                  <button 
                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
                    onClick={() => {
                      // TODO: Add file operations menu
                    }}
                  >
                    More Options
                  </button>
                </div>
              </div>
            )}
          </div>
       </div>
    </div>
  );
};
