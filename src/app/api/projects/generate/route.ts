import { z } from "zod";
import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import type { ToolChoice } from "ai";

import { requireAuth } from "@/lib/stack-auth-api";
import { checkAccess, trackUsage } from "@/lib/autumn-server";
import { createFileTools } from "@/lib/ai-tools";
import { generateTextWithToolsPreferCerebras, type GenerateTextWithToolsResult } from "@/lib/generate-text-with-tools";
import { withRetry } from "@/lib/retry";

import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

const FEATURE_ID = 'projects';

const requestSchema = z.object({
  description: z.string().min(10),
  projectName: z.string().optional(),
});

const SYSTEM_PROMPT = `You are an expert software developer. Generate project files based on the user's description.

You have access to tools to create files:
- writeFile: Create files with content
- listFiles: Check what files exist

Use the tools to create or update files. Keep each step focused on only the files requested.

Focus on creating functional, production-ready code.`;

interface GenerationContext {
  projectId: Id<"projects">;
  description: string;
  internalKey: string;
  convexUrl: string;
  convexToken: string;
}

async function processProjectGeneration(context: GenerationContext) {
  const { projectId, description, internalKey, convexUrl, convexToken } = context;

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
      // Silently fail logging
    }
  };

  try {
    // Step 1: Validate input
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
        const result = await withRetry(
          async () => {
            return await generateTextWithToolsPreferCerebras({
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
          },
          {
            maxAttempts: 3,
            baseDelay: 1000,
            onRetry: (error, attempt) => {
              console.log(`[Retry] Generation step ${id} attempt ${attempt} failed: ${error.message}`);
            },
          }
        );

        await logEvent({ type: "step", message: `Completed ${id}` });
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        await logEvent({ type: "error", message: `${id} failed: ${message}` });
        throw error;
      }
    };

    // Run all 9 generation steps
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

    console.log(`[Project Generation] Completed successfully for project ${projectId}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await logEvent({ type: "error", message: `Project generation failed: ${message}` });
    console.error("Project generation failed:", error);
  }
}

export async function POST(request: Request) {
  const { user, userId, getToken, response } = await requireAuth();

  if (!user) {
    return response;
  }

  const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;

  if (!internalKey) {
    return NextResponse.json(
      { error: "Internal key not configured" },
      { status: 500 }
    );
  }

  const token = await getToken();

  if (!token) {
    return NextResponse.json(
      { error: "Failed to get authentication token" },
      { status: 401 }
    );
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;

  const convex = new ConvexHttpClient(convexUrl);
  convex.setAuth(token);

  const body = await request.json();
  const { description, projectName } = requestSchema.parse(body);

  const name = projectName || `Generated Project ${Date.now()}`;

  try {
    const checkResult = await checkAccess({
      customer_id: userId,
      feature_id: FEATURE_ID,
    });

    if (!checkResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Project limit reached. Please upgrade to Pro for unlimited projects.',
          currentUsage: checkResult.usage || 0,
          limit: checkResult.included_usage || 0,
        },
        { status: 403 }
      );
    }

    const projectId = await convex.mutation(api.projects.create, {
      name,
    });

    await trackUsage(userId, FEATURE_ID, 1);

    // Start background processing (don't await)
    processProjectGeneration({
      projectId: projectId as Id<"projects">,
      description,
      internalKey,
      convexUrl,
      convexToken: token,
    });

    // Return immediately with processing status
    return NextResponse.json({
      projectId,
      status: "processing",
    });
  } catch (error) {
    console.error("Project generation failed:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isAutumnError = errorMessage.includes("AUTUMN") || errorMessage.includes("environment variable");
    
    return NextResponse.json(
      { 
        error: isAutumnError 
          ? "Billing service configuration error. Please contact support."
          : "Failed to generate project",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
