import { generateText, stepCountIs } from "ai";
import { inngest } from "./client";
import { firecrawl } from "@/lib/firecrawl";
import { ConvexHttpClient } from "convex/browser";

import { anthropic } from "@/lib/ai-providers";
import { createFileTools } from "@/lib/ai-tools";

import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

const URL_REGEX = /https?:\/\/[^\s]+/g;

const SYSTEM_PROMPT = `You are an expert software developer. Generate a complete project based on the user's description.

You have access to tools to create files:
- writeFile: Create files with content
- listFiles: Check what files exist

Create a well-structured project with:
1. Proper folder organization
2. All necessary configuration files (package.json, tsconfig.json, etc.)
3. Source code files with complete implementations
4. A README.md explaining the project

Focus on creating functional, production-ready code. Start by creating the essential configuration files, then the source code.`;

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

    // Create Convex client for this background job
    const convex = new ConvexHttpClient(convexUrl);
    convex.setAuth(convexToken);

    // Run AI generation in background
    await step.run("generate", async () => {
      const tools = createFileTools(projectId, internalKey, convex);

      return await generateText({
        model: anthropic("anthropic/claude-sonnet-4"),
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Create a project with the following description:\n\n${description}`,
          },
        ],
        tools,
        stopWhen: stepCountIs(10),
      });
    });

    return { success: true, projectId };
  }
);

export const demoGenerate = inngest.createFunction(
  { id: "demo-generate" },
  { event: "demo/generate" },
  async ({ event, step }) => {
    const { prompt } = event.data as { prompt: string; };

    const urls = await step.run("exctract-urls", async () => {
      return prompt.match(URL_REGEX) ?? [];
    }) as string[];

    const scrapedContent = await step.run("scrape-urls", async () => {
      const results = await Promise.all(
        urls.map(async (url) => {
          const result = await firecrawl.scrape(
            url,
            { formats: ["markdown"] },
          );
          return result.markdown ?? null;
        })
      );
      return results.filter(Boolean).join("\n\n");
    });

    const finalPrompt = scrapedContent
      ? `Context:\n${scrapedContent}\n\nQuestion: ${prompt}`
      : prompt;

    await step.run("generate-text", async () => {
      return await generateText({
        model: anthropic('anthropic/claude-3-haiku'),
        prompt: finalPrompt,
        experimental_telemetry: {
          isEnabled: true,
          recordInputs: true,
          recordOutputs: true,
        },
      });
    })
  },
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
