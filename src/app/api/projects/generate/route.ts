import { z } from "zod";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/stack-auth-api";
import { ConvexHttpClient } from "convex/browser";

import { inngest } from "@/inngest/client";
import { checkAccess, trackUsage } from "@/lib/autumn-server";
import { api } from "../../../../../convex/_generated/api";

const FEATURE_ID = 'projects';

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
