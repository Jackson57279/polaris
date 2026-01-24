import { createTool } from "@inngest/agent-kit";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";

import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export interface FileToolsContext {
  projectId: Id<"projects">;
  internalKey: string;
  convex: ConvexHttpClient;
}

export function createAgentFileTools(ctx: FileToolsContext) {
  const { projectId, internalKey, convex } = ctx;

  const readFile = createTool({
    name: "readFile",
    description: "Read the contents of a file in the project",
    parameters: z.object({
      path: z.string().describe("File path relative to project root (e.g., 'src/index.ts')"),
    }),
    handler: async ({ path }) => {
      try {
        const file = await convex.query(api.system.readFileByPath, {
          internalKey,
          projectId,
          path,
        });

        if (!file) {
          return { success: false, error: `File not found: ${path}` };
        }

        return { success: true, content: file.content ?? "" };
      } catch (error) {
        return {
          success: false,
          error: `Error reading file: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    },
  });

  const writeFile = createTool({
    name: "writeFile",
    description:
      "Create a new file or update an existing file. Parent folders are created automatically if they don't exist.",
    parameters: z.object({
      path: z.string().describe("File path relative to project root (e.g., 'src/utils/helpers.ts')"),
      content: z.string().describe("The content to write to the file"),
    }),
    handler: async ({ path, content }) => {
      try {
        await convex.mutation(api.system.writeFileByPath, {
          internalKey,
          projectId,
          path,
          content,
        });

        const preview = content.length > 500 ? `${content.slice(0, 500)}…` : content;
        try {
          await convex.mutation(api.system.appendGenerationEvent, {
            internalKey,
            projectId,
            type: "file",
            message: `Wrote ${path}`,
            filePath: path,
            preview,
          });
        } catch {
          // Best-effort logging
        }

        return { success: true, message: `Successfully wrote to ${path}` };
      } catch (error) {
        return {
          success: false,
          error: `Error writing file: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    },
  });

  const deleteFile = createTool({
    name: "deleteFile",
    description: "Delete a file or folder. If deleting a folder, all contents are deleted recursively.",
    parameters: z.object({
      path: z.string().describe("File or folder path relative to project root"),
    }),
    handler: async ({ path }) => {
      try {
        await convex.mutation(api.system.deleteFileByPath, {
          internalKey,
          projectId,
          path,
        });

        try {
          await convex.mutation(api.system.appendGenerationEvent, {
            internalKey,
            projectId,
            type: "file",
            message: `Deleted ${path}`,
            filePath: path,
          });
        } catch {
          // Best-effort logging
        }

        return { success: true, message: `Successfully deleted ${path}` };
      } catch (error) {
        return {
          success: false,
          error: `Error deleting file: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    },
  });

  const listFiles = createTool({
    name: "listFiles",
    description: "List all files and folders in a directory. Returns a tree structure of the directory contents.",
    parameters: z.object({
      path: z.string().optional().describe("Directory path relative to project root. Leave empty for root directory."),
    }),
    handler: async ({ path }) => {
      try {
        const files = await convex.query(api.system.listFilesByPath, {
          internalKey,
          projectId,
          path: path ?? "",
        });

        if (files.length === 0) {
          return {
            success: true,
            files: [],
            message: path ? `Directory is empty: ${path}` : "Project has no files yet.",
          };
        }

        const formatted = files.map((f) => ({
          name: f.name,
          type: f.type,
        }));

        return { success: true, files: formatted };
      } catch (error) {
        return {
          success: false,
          error: `Error listing files: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    },
  });

  const getProjectStructure = createTool({
    name: "getProjectStructure",
    description: "Get the complete file structure of the project as a tree view. Useful for understanding the project layout.",
    parameters: z.object({}),
    handler: async () => {
      try {
        const structure = await convex.query(api.system.getProjectStructure, {
          internalKey,
          projectId,
        });

        if (!structure || structure.length === 0) {
          return { success: true, structure: "", message: "Project has no files yet." };
        }

        return { success: true, structure };
      } catch (error) {
        return {
          success: false,
          error: `Error getting project structure: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    },
  });

  return [readFile, writeFile, deleteFile, listFiles, getProjectStructure];
}

export type AgentFileTools = ReturnType<typeof createAgentFileTools>;
