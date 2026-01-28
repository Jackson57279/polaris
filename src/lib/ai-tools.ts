import { tool, zodSchema } from "ai";
import { z } from "zod";

import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

// Global convex client for API route context
let globalConvex: ConvexHttpClient | null = null;

export function setGlobalConvex(client: ConvexHttpClient) {
  globalConvex = client;
}

function getConvex(client?: ConvexHttpClient): ConvexHttpClient {
  if (client) return client;
  if (!globalConvex) {
    throw new Error(
      "Convex client not initialized. Pass a ConvexHttpClient to createFileTools or call setGlobalConvex first."
    );
  }
  return globalConvex;
}

export const createFileTools = (
  projectId: Id<"projects">,
  internalKey: string,
  convex?: ConvexHttpClient
) => ({
  readFile: tool({
    description: "Read the contents of a file in the project",
    inputSchema: zodSchema(
      z.object({
        path: z
          .string()
          .describe("File path relative to project root (e.g., 'src/index.ts')"),
      })
    ),
    execute: async ({ path }: { path: string }) => {
      const client = getConvex(convex);
      try {
        const file = await client.query(api.system.readFileByPath, {
          internalKey,
          projectId,
          path,
        });

        if (!file) {
          return `File not found: ${path}`;
        }

        return file.content ?? "";
      } catch (error) {
        return `Error reading file: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  }),

  writeFile: tool({
    description:
      "Create a new file or update an existing file. Parent folders are created automatically if they don't exist.",
    inputSchema: zodSchema(
      z.object({
        path: z
          .string()
          .describe("File path relative to project root (e.g., 'src/utils/helpers.ts')"),
        content: z.string().describe("The content to write to the file"),
      })
    ),
    execute: async ({ path, content }: { path: string; content: string }) => {
      const client = getConvex(convex);
      try {
        await client.mutation(api.system.writeFileByPath, {
          internalKey,
          projectId,
          path,
          content,
        });

        const preview = content.length > 500 ? `${content.slice(0, 500)}…` : content;
        try {
          await client.mutation(api.system.appendGenerationEvent, {
            internalKey,
            projectId,
            type: "file",
            message: `Wrote ${path}`,
            filePath: path,
            preview,
          });
        } catch {
          // Best-effort logging for generation events.
        }

        return `Successfully wrote to ${path}`;
      } catch (error) {
        return `Error writing file: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  }),

  deleteFile: tool({
    description:
      "Delete a file or folder. If deleting a folder, all contents are deleted recursively.",
    inputSchema: zodSchema(
      z.object({
        path: z
          .string()
          .describe("File or folder path relative to project root"),
      })
    ),
    execute: async ({ path }: { path: string }) => {
      const client = getConvex(convex);
      try {
        await client.mutation(api.system.deleteFileByPath, {
          internalKey,
          projectId,
          path,
        });

        try {
          await client.mutation(api.system.appendGenerationEvent, {
            internalKey,
            projectId,
            type: "file",
            message: `Deleted ${path}`,
            filePath: path,
          });
        } catch {
          // Best-effort logging for generation events.
        }

        return `Successfully deleted ${path}`;
      } catch (error) {
        return `Error deleting file: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  }),

  listFiles: tool({
    description:
      "List all files and folders in a directory. Returns a tree structure of the directory contents.",
    inputSchema: zodSchema(
      z.object({
        path: z
          .string()
          .optional()
          .describe(
            "Directory path relative to project root. Leave empty for root directory."
          ),
      })
    ),
    execute: async ({ path }: { path?: string }) => {
      const client = getConvex(convex);
      try {
        const files = await client.query(api.system.listFilesByPath, {
          internalKey,
          projectId,
          path: path ?? "",
        });

        if (files.length === 0) {
          return path
            ? `Directory is empty: ${path}`
            : "Project has no files yet.";
        }

        const formatted = files
          .map((f) => `${f.type === "folder" ? "[folder]" : "[file]"} ${f.name}`)
          .join("\n");

        return formatted;
      } catch (error) {
        return `Error listing files: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  }),

  getProjectStructure: tool({
    description:
      "Get the complete file structure of the project as a tree view. Useful for understanding the project layout.",
    inputSchema: zodSchema(z.object({})),
    execute: async () => {
      const client = getConvex(convex);
      try {
        const structure = await client.query(api.system.getProjectStructure, {
          internalKey,
          projectId,
        });

        if (!structure || structure.length === 0) {
          return "Project has no files yet.";
        }

        return structure;
      } catch (error) {
        return `Error getting project structure: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  }),
});

export type FileTools = ReturnType<typeof createFileTools>;
