"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import type { WebContainer, WebContainerProcess } from "@webcontainer/api";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { getWebContainer, teardownWebContainer } from "@/lib/webcontainer";
import { syncFilesToContainer } from "./lib/sync";

interface FileEntry {
  path: string;
  content: string;
  type: "file" | "folder";
}

interface WebContainerContextValue {
  container: WebContainer | null;
  isBooting: boolean;
  error: Error | null;
  serverUrl: string | null;
  currentProcess: WebContainerProcess | null;
  setCurrentProcess: (process: WebContainerProcess | null) => void;
}

const WebContainerContext = createContext<WebContainerContextValue | null>(null);

interface WebContainerProviderProps {
  children: React.ReactNode;
  projectId?: Id<"projects">;
}

export function WebContainerProvider({ children, projectId }: WebContainerProviderProps) {
  const [container, setContainer] = useState<WebContainer | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [currentProcess, setCurrentProcess] = useState<WebContainerProcess | null>(null);
  const files = useQuery(api.files.getFiles, projectId ? { projectId } : "skip");

  useEffect(() => {
    let mounted = true;

    getWebContainer()
      .then((wc) => {
        if (!mounted) return;
        setContainer(wc);
        setIsBooting(false);

        wc.on("server-ready", (_port, url) => {
          setServerUrl(url);
        });
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsBooting(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      teardownWebContainer();
    };
  }, []);

  // Sync files to WebContainer when both container and files are ready
  useEffect(() => {
    if (!container || !files || files.length === 0) return;

    const syncFiles = async () => {
      try {
        // Build file entries with full paths
        const fileEntries: FileEntry[] = [];
        const fileMap = new Map(files.map((f) => [f._id, f]));

        // Helper to build full path by traversing parent chain
        const buildPath = (fileId: string): string => {
          const pathSegments: string[] = [];
          let currentId: string | undefined = fileId;

          while (currentId) {
            const file = fileMap.get(currentId as Id<"files">);
            if (!file) break;
            pathSegments.unshift(file.name);
            currentId = file.parentId as string | undefined;
          }

          return pathSegments.join("/");
        };

        // Process all files
        for (const file of files) {
          const path = buildPath(file._id);

          // Skip binary files (they have storageId)
          if (file.storageId) continue;

          fileEntries.push({
            path,
            content: file.content || "",
            type: file.type,
          });
        }

        // Sync to container
        if (fileEntries.length > 0) {
          await syncFilesToContainer(container, fileEntries);
        }
      } catch (err) {
        console.error("Failed to sync files to WebContainer:", err);
      }
    };

    syncFiles();
  }, [container, files]);

  return (
    <WebContainerContext.Provider
      value={{
        container,
        isBooting,
        error,
        serverUrl,
        currentProcess,
        setCurrentProcess,
      }}
    >
      {children}
    </WebContainerContext.Provider>
  );
}

export function useWebContainer() {
  const ctx = useContext(WebContainerContext);
  if (!ctx) {
    throw new Error("useWebContainer must be used within WebContainerProvider");
  }
  return ctx;
}

export function useWebContainerOptional() {
  return useContext(WebContainerContext);
}
