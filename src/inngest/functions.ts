import { ConvexHttpClient } from "convex/browser";
import type { ToolChoice } from "ai";

import { generateWithFallback } from "@/lib/ai-providers";
import { createFileTools } from "@/lib/ai-tools";
import { firecrawl } from "@/lib/firecrawl";
import { generateTextWithToolsPreferCerebras, type GenerateTextWithToolsResult } from "@/lib/generate-text-with-tools";

import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { inngest } from "./client";

const URL_REGEX = /https?:\/\/[^\s]+/g;

const SYSTEM_PROMPT = `You are an expert software developer. Generate project files based on the user's description.

You have access to tools to create files:
- writeFile: Create files with content
- listFiles: Check what files exist

Use the tools to create or update files. Keep each step focused on only the files requested.

Focus on creating functional, production-ready code.`;

export const generateProject = inngest.createFunction(
  { id: "generate-project" },
  { event: "project/generate" },
  async ({ event, step }) => {
    const { projectId, description, internalKey, convexUrl, convexToken, agentId } =
      event.data as {
        projectId: Id<"projects">;
        description: string;
        internalKey: string;
        convexUrl: string;
        convexToken: string;
        agentId?: string;
      };

    const convex = new ConvexHttpClient(convexUrl);
    convex.setAuth(convexToken);

    // Create background agent if not provided
    let backgroundAgentId = agentId;
    if (!backgroundAgentId) {
      backgroundAgentId = await step.run("create-agent", async () => {
        return await convex.mutation(api.agents.createAgent, {
          projectId,
          type: "generation",
          title: "Project Generation",
          description: `Generating project: ${description}`,
        });
      });
    }

    // Update agent status to running
    await step.run("start-agent", async () => {
      await convex.mutation(api.agents.updateAgentProgress, {
        agentId: backgroundAgentId as Id<"backgroundAgents">,
        progress: 0,
        currentStep: "Starting project generation",
        status: "running",
      });
    });

    const logEvent = async (payload: {
      type: "step" | "file" | "info" | "error";
      message: string;
      filePath?: string;
      preview?: string;
    }) => {
      try {
        await convex.mutation(api.system.appendGenerationEvent, {
          internalKey,
          projectId,
          ...payload,
        });
      } catch {
        // Best-effort logging.
      }
    };

    // Helper to update agent progress
    const updateProgress = async (progress: number, step: string) => {
      try {
        await convex.mutation(api.agents.updateAgentProgress, {
          agentId: backgroundAgentId as Id<"backgroundAgents">,
          progress,
          currentStep: step,
        });
      } catch {
        // Best-effort update
      }
    };

    await step.run("validate-input", async () => {
      await logEvent({ type: "step", message: "Starting validate-input" });
      await updateProgress(5, "Validating input");
      if (!description.trim()) {
        await logEvent({
          type: "error",
          message: "Validation failed: description is required",
        });
        await convex.mutation(api.agents.completeAgent, {
          agentId: backgroundAgentId as Id<"backgroundAgents">,
          status: "failed",
          error: "Description is required",
        });
        throw new Error("Description is required");
      }
      await logEvent({ type: "step", message: "Completed validate-input" });
    });

    const tools = createFileTools(projectId, internalKey, convex);
    await step.run("initialize-tools", async () => {
      await logEvent({ type: "step", message: "Starting initialize-tools" });
      await updateProgress(10, "Initializing tools");
      await logEvent({ type: "step", message: "Completed initialize-tools" });
    });

    type GenerationToolChoice = ToolChoice<ReturnType<typeof createFileTools>>;

    const defaultToolChoice = (stepNumber: number): GenerationToolChoice =>
      stepNumber === 0 ? { type: "tool", toolName: "writeFile" } : "auto";

    const runGenerationStep = async ({
      id,
      prompt,
      maxSteps = 6,
      toolChoice,
      progressStart,
      progressEnd,
    }: {
      id: string;
      prompt: string;
      maxSteps?: number;
      toolChoice?: (stepNumber: number) => GenerationToolChoice;
      progressStart: number;
      progressEnd: number;
    }): Promise<GenerateTextWithToolsResult> => {
      return await step.run(id, async () => {
        await logEvent({ type: "step", message: `Starting ${id}` });
        await updateProgress(progressStart, id);
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
          await updateProgress(progressEnd, `Completed ${id}`);
          return result;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          await logEvent({ type: "error", message: `${id} failed: ${message}` });
          await convex.mutation(api.agents.completeAgent, {
            agentId: backgroundAgentId as Id<"backgroundAgents">,
            status: "failed",
            error: `${id} failed: ${message}`,
          });
          throw error;
        }
      });
    };

    await runGenerationStep({
      id: "generate-config-files",
      prompt:
        "Create only the essential configuration files (package.json, tsconfig.json, vite.config.ts, index.html if needed). Use writeFile for each file. Do not create source files yet.",
      maxSteps: 8,
      progressStart: 15,
      progressEnd: 25,
    });

    await runGenerationStep({
      id: "generate-source-structure",
      prompt:
        "Create the project entry points and base structure (src/main.tsx, src/App.tsx, theme setup if needed). Only write these base files.",
      maxSteps: 8,
      progressStart: 25,
      progressEnd: 40,
    });

    await runGenerationStep({
      id: "generate-components",
      prompt:
        "Create shared UI components referenced by App (e.g., Navbar, Sidebar). Only write component files and related component-level styles or helpers if needed.",
      maxSteps: 8,
      progressStart: 40,
      progressEnd: 55,
    });

    await runGenerationStep({
      id: "generate-pages",
      prompt:
        "Create page components for the routes (Dashboard, Clients, ClientDetail, AddClient, Tasks). Only write page files and minimal route-specific helpers.",
      maxSteps: 8,
      progressStart: 55,
      progressEnd: 70,
    });

    await runGenerationStep({
      id: "generate-hooks",
      prompt:
        "Create the client data hook(s) and related logic (e.g., useClients). Only write hook files and their types.",
      maxSteps: 6,
      progressStart: 70,
      progressEnd: 80,
    });

    await runGenerationStep({
      id: "generate-types",
      prompt:
        "Create type definitions (e.g., src/types/client.ts). Only write type files.",
      maxSteps: 4,
      progressStart: 80,
      progressEnd: 85,
    });

    await runGenerationStep({
      id: "generate-utilities",
      prompt:
        "Create any remaining utilities or supporting files required by existing code. Only write utility files that are referenced.",
      maxSteps: 6,
      progressStart: 85,
      progressEnd: 92,
    });

    await runGenerationStep({
      id: "finalize-readme",
      prompt:
        "Create or update README.md with a short setup guide. Only write README.md.",
      maxSteps: 4,
      progressStart: 92,
      progressEnd: 95,
    });

    await runGenerationStep({
      id: "verify-project",
      prompt:
        "List the project files using listFiles to confirm completion. Do not write new files in this step.",
      maxSteps: 2,
      toolChoice: (stepNumber): GenerationToolChoice =>
        stepNumber === 0 ? { type: "tool", toolName: "listFiles" } : "auto",
      progressStart: 95,
      progressEnd: 99,
    });

    // Mark agent as completed
    await step.run("complete-agent", async () => {
      await convex.mutation(api.agents.completeAgent, {
        agentId: backgroundAgentId as Id<"backgroundAgents">,
        status: "completed",
      });
    });

    return { success: true, projectId };
  }
);

export const demoGenerate = inngest.createFunction(
  { id: "demo-generate" },
  { event: "demo/generate" },
  async ({ event, step }) => {
    const { prompt } = event.data as { prompt: string };

    const urls = (await step.run("extract-urls", async () => {
      return prompt.match(URL_REGEX) ?? [];
    })) as string[];

    const scrapedContent = await step.run("scrape-urls", async () => {
      if (!firecrawl) {
        return "";
      }

      const results = await Promise.all(
        urls.map(async (url) => {
          if (!firecrawl) return null;
          const result = await firecrawl.scrape(url, { formats: ["markdown"] });
          return result.markdown ?? null;
        })
      );

      return results.filter(Boolean).join("\n\n");
    });

    const finalPrompt = scrapedContent
      ? `Context:\n${scrapedContent}\n\nQuestion: ${prompt}`
      : prompt;

    await step.run("generate-text", async () => {
      return await generateWithFallback(
        [{ role: "user", content: finalPrompt }],
        { temperature: 0.7, max_tokens: 2000 }
      );
    });
  }
);

export const demoError = inngest.createFunction(
  { id: "demo-error" },
  { event: "demo/error" },
  async ({ step }) => {
    await step.run("fail", async () => {
      throw new Error("Inngest error: Background job failed!");
    });
  }
);
