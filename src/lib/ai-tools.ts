import { tool, zodSchema } from "ai";
import { z } from "zod";

import { convex } from "@/lib/convex-client";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export const createFileTools = (
  projectId: Id<"projects">,
  internalKey: string
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
      try {
        const file = await convex.query(api.system.readFileByPath, {
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
      try {
        await convex.mutation(api.system.writeFileByPath, {
          internalKey,
          projectId,
          path,
          content,
        });

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
      try {
        await convex.mutation(api.system.deleteFileByPath, {
          internalKey,
          projectId,
          path,
        });

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
      try {
        const files = await convex.query(api.system.listFilesByPath, {
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
      try {
        const structure = await convex.query(api.system.getProjectStructure, {
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
