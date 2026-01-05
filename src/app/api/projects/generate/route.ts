import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateText, stepCountIs } from "ai";

import { convex } from "@/lib/convex-client";
import { anthropic } from "@/lib/ai-providers";
import { createFileTools } from "@/lib/ai-tools";

import { api } from "../../../../../convex/_generated/api";

const requestSchema = z.object({
  description: z.string().min(10),
  projectName: z.string().optional(),
});

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

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;

  if (!internalKey) {
    return NextResponse.json(
      { error: "Internal key not configured" },
      { status: 500 }
    );
  }

  const body = await request.json();
  const { description, projectName } = requestSchema.parse(body);

  const name = projectName || `Generated Project ${Date.now()}`;

  try {
    const projectId = await convex.mutation(api.projects.create, {
      name,
    });

    const tools = createFileTools(projectId, internalKey);

    await generateText({
      model: anthropic("anthropic/claude-sonnet-4-20250514"),
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Create a project with the following description:\n\n${description}`,
        },
      ],
      tools,
      stopWhen: stepCountIs(20),
    });

    return NextResponse.json({
      success: true,
      projectId,
    });
  } catch (error) {
    console.error("Project generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate project" },
      { status: 500 }
    );
  }
}
