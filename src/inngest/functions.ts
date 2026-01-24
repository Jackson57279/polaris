import { ConvexHttpClient } from "convex/browser";
import { createAgent, createNetwork } from "@inngest/agent-kit";

import { createAgentFileTools } from "@/lib/agent-kit-tools";
import { createCerebrasModel, createOpenRouterModel } from "@/lib/agent-kit-provider";
import { firecrawl } from "@/lib/firecrawl";

import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { inngest } from "./client";

const URL_REGEX = /https?:\/\/[^\s]+/g;

const PROJECT_GENERATION_SYSTEM_PROMPT = `You are an expert software developer. Generate project files based on the user's description.

You have access to tools to create files:
- writeFile: Create files with content
- listFiles: Check what files exist
- readFile: Read existing file contents
- deleteFile: Delete files or folders
- getProjectStructure: See the complete file tree

Use the tools to create or update files. Keep each step focused on only the files requested.

Focus on creating functional, production-ready code.`;

function getModel() {
  try {
    if (process.env.CEREBRAS_API_KEY) {
      return createCerebrasModel();
    }
  } catch {
    // Fall through to OpenRouter
  }
  return createOpenRouterModel();
}

export const generateProject = inngest.createFunction(
  { id: "generate-project" },
  { event: "project/generate" },
  async ({ event, step }) => {
    const { projectId, description, internalKey, convexUrl, convexToken } =
      event.data as {
        projectId: Id<"projects">;
        description: string;
        internalKey: string;
        convexUrl: string;
        convexToken: string;
      };

    const convex = new ConvexHttpClient(convexUrl);
    convex.setAuth(convexToken);

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
        // Best-effort logging
      }
    };

    await step.run("validate-input", async () => {
      await logEvent({ type: "step", message: "Starting validate-input" });
      if (!description.trim()) {
        await logEvent({
          type: "error",
          message: "Validation failed: description is required",
        });
        throw new Error("Description is required");
      }
      await logEvent({ type: "step", message: "Completed validate-input" });
    });

    const tools = createAgentFileTools({ projectId, internalKey, convex });

    const codeGeneratorAgent = createAgent({
      name: "code-generator",
      description: "An AI agent that generates project files based on descriptions",
      system: PROJECT_GENERATION_SYSTEM_PROMPT,
      model: getModel(),
      tools,
      tool_choice: "auto",
    });

    const network = createNetwork({
      name: "project-generation-network",
      agents: [codeGeneratorAgent],
      defaultModel: getModel(),
      maxIter: 50,
    });

    const runGenerationStep = async (stepId: string, prompt: string) => {
      return await step.run(stepId, async () => {
        await logEvent({ type: "step", message: `Starting ${stepId}` });
        try {
          const result = await network.run(
            `Project description:\n${description}\n\n${prompt}`
          );

          const toolCallCount = result.state.results.reduce((count, r) => {
            if (r.output) {
              const toolMessages = r.output.filter((m) => m.type === "tool_call");
              return count + toolMessages.length;
            }
            return count;
          }, 0);

          if (toolCallCount > 0) {
            await logEvent({
              type: "info",
              message: `${stepId} made ${toolCallCount} tool call(s)`,
            });
          }

          await logEvent({ type: "step", message: `Completed ${stepId}` });
          return { success: true, toolCallCount };
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          await logEvent({ type: "error", message: `${stepId} failed: ${message}` });
          throw error;
        }
      });
    };

    await runGenerationStep(
      "generate-config-files",
      "Create only the essential configuration files (package.json, tsconfig.json, vite.config.ts, index.html if needed). Use writeFile for each file. Do not create source files yet."
    );

    await runGenerationStep(
      "generate-source-structure",
      "Create the project entry points and base structure (src/main.tsx, src/App.tsx, theme setup if needed). Only write these base files."
    );

    await runGenerationStep(
      "generate-components",
      "Create shared UI components referenced by App (e.g., Navbar, Sidebar). Only write component files and related component-level styles or helpers if needed."
    );

    await runGenerationStep(
      "generate-pages",
      "Create page components for the routes (Dashboard, Clients, ClientDetail, AddClient, Tasks). Only write page files and minimal route-specific helpers."
    );

    await runGenerationStep(
      "generate-hooks",
      "Create the client data hook(s) and related logic (e.g., useClients). Only write hook files and their types."
    );

    await runGenerationStep(
      "generate-types",
      "Create type definitions (e.g., src/types/client.ts). Only write type files."
    );

    await runGenerationStep(
      "generate-utilities",
      "Create any remaining utilities or supporting files required by existing code. Only write utility files that are referenced."
    );

    await runGenerationStep(
      "finalize-readme",
      "Create or update README.md with a short setup guide. Only write README.md."
    );

    await runGenerationStep(
      "verify-project",
      "List the project files using listFiles or getProjectStructure to confirm completion. Do not write new files in this step."
    );

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

    const textGeneratorAgent = createAgent({
      name: "text-generator",
      description: "An AI agent that generates text responses",
      system: "You are a helpful assistant that provides clear, concise answers.",
      model: getModel(),
    });

    const result = await step.run("generate-text", async () => {
      const response = await textGeneratorAgent.run(finalPrompt);
      const textOutput = response.output.find((m) => m.type === "text");
      return textOutput?.content ?? "";
    });

    return { text: result };
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
