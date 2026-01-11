import { z } from "zod";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/stack-auth-api";
import { ConvexHttpClient } from "convex/browser";

import { inngest } from "@/inngest/client";
import { api } from "../../../../../convex/_generated/api";

const requestSchema = z.object({
  description: z.string().min(10),
  projectName: z.string().optional(),
});

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
    const projectId = await convex.mutation(api.projects.create, {
      name,
    });

    // Trigger background job for AI generation (returns immediately)
    await inngest.send({
      name: "project/generate",
      data: {
        projectId,
        description,
        internalKey,
        convexUrl,
        convexToken: token,
      },
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
