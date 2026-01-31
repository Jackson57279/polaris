import { ConvexHttpClient } from "convex/browser";
import type { ToolChoice } from "ai";
import { task } from "@trigger.dev/sdk/v3";

import { createFileTools } from "@/lib/ai-tools";
import { generateTextWithToolsPreferCerebras, type GenerateTextWithToolsResult } from "@/lib/generate-text-with-tools";

import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface GenerateProjectPayload {
  projectId: Id<"projects">;
  description: string;
  internalKey: string;
  convexUrl: string;
  convexToken: string;
}

const SYSTEM_PROMPT = `You are an expert software developer. Generate project files based on the user's description.

You have access to tools to create files:
- writeFile: Create files with content
- listFiles: Check what files exist

Use the tools to create or update files. Keep each step focused on only the files requested.

Focus on creating functional, production-ready code.`;

export const generateProject = task({
  id: "generate-project",
  run: async (payload: GenerateProjectPayload) => {
    const { projectId, description, internalKey, convexUrl, convexToken } = payload;

    const convex = new ConvexHttpClient(convexUrl);
    convex.setAuth(convexToken);

    const logEvent = async (eventPayload: {
      type: "step" | "file" | "info" | "error";
      message: string;
      filePath?: string;
      preview?: string;
    }) => {
      try {
        await convex.mutation(api.system.appendGenerationEvent, {
          internalKey,
          projectId,
          ...eventPayload,
        });
      } catch {
      }
    };

    await logEvent({ type: "step", message: "Starting validate-input" });
    if (!description.trim()) {
      await logEvent({
        type: "error",
        message: "Validation failed: description is required",
      });
      throw new Error("Description is required");
    }
    await logEvent({ type: "step", message: "Completed validate-input" });

    type GenerationToolChoice = ToolChoice<ReturnType<typeof createFileTools>>;

    const defaultToolChoice = (stepNumber: number): GenerationToolChoice =>
      stepNumber === 0 ? { type: "tool", toolName: "writeFile" } : "auto";

    const runGenerationStep = async ({
      id,
      prompt,
      maxSteps = 6,
      toolChoice,
    }: {
      id: string;
      prompt: string;
      maxSteps?: number;
      toolChoice?: (stepNumber: number) => GenerationToolChoice;
    }): Promise<GenerateTextWithToolsResult> => {
      await logEvent({ type: "step", message: `Starting ${id}` });

      const stepConvex = new ConvexHttpClient(convexUrl);
      stepConvex.setAuth(convexToken);
      const tools = createFileTools(projectId, internalKey, stepConvex);

      try {
        const result = await generateTextWithToolsPreferCerebras({
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: `Project description:\n${description}\n\n${prompt}`,
            },
          ],
          tools,
          maxSteps,
          maxTokens: 2000,
          toolChoice: toolChoice ?? defaultToolChoice,
          onStepFinish: async ({ toolCalls }) => {
            if (toolCalls && toolCalls.length > 0) {
              await logEvent({
                type: "info",
                message: `${id} emitted ${toolCalls.length} tool call(s)`,
              });
            }
          },
        });
        await logEvent({ type: "step", message: `Completed ${id}` });
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        await logEvent({ type: "error", message: `${id} failed: ${message}` });
        throw error;
      }
    };

    await runGenerationStep({
      id: "generate-config-files",
      prompt:
        "Create only the essential configuration files (package.json, tsconfig.json, vite.config.ts, index.html if needed). Use writeFile for each file. Do not create source files yet.",
      maxSteps: 8,
    });

    await runGenerationStep({
      id: "generate-source-structure",
      prompt:
        "Create the project entry points and base structure (src/main.tsx, src/App.tsx, theme setup if needed). Only write these base files.",
      maxSteps: 8,
    });

    await runGenerationStep({
      id: "generate-components",
      prompt:
        "Create shared UI components referenced by App (e.g., Navbar, Sidebar). Only write component files and related component-level styles or helpers if needed.",
      maxSteps: 8,
    });

    await runGenerationStep({
      id: "generate-pages",
      prompt:
        "Create page components for the routes (Dashboard, Clients, ClientDetail, AddClient, Tasks). Only write page files and minimal route-specific helpers.",
      maxSteps: 8,
    });

    await runGenerationStep({
      id: "generate-hooks",
      prompt:
        "Create the client data hook(s) and related logic (e.g., useClients). Only write hook files and their types.",
      maxSteps: 6,
    });

    await runGenerationStep({
      id: "generate-types",
      prompt:
        "Create type definitions (e.g., src/types/client.ts). Only write type files.",
      maxSteps: 4,
    });

    await runGenerationStep({
      id: "generate-utilities",
      prompt:
        "Create any remaining utilities or supporting files required by existing code. Only write utility files that are referenced.",
      maxSteps: 6,
    });

    await runGenerationStep({
      id: "finalize-readme",
      prompt:
        "Create or update README.md with a short setup guide. Only write README.md.",
      maxSteps: 4,
    });

    await runGenerationStep({
      id: "verify-project",
      prompt:
        "List the project files using listFiles to confirm completion. Do not write new files in this step.",
      maxSteps: 2,
      toolChoice: (stepNumber): GenerationToolChoice =>
        stepNumber === 0 ? { type: "tool", toolName: "listFiles" } : "auto",
    });

    return { success: true, projectId };
  },
});
