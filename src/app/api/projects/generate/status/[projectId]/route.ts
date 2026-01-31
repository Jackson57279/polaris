import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/stack-auth-api";
import { convex } from "@/lib/convex-client";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const { user, response } = await requireAuth();

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

  try {
    const { projectId } = params;

    // Get project to check existence
    const project = await convex.query(api.projects.getById, {
      projectId: projectId as Id<"projects">,
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Get generation events for this project
    const events = await convex.query(api.system.getGenerationEventsByProject, {
      internalKey,
      projectId: projectId as Id<"projects">,
    });

    // Calculate progress based on events
    // Typical flow has 9 steps: validate-input + 8 generation steps
    const totalSteps = 9;
    const completedSteps = events.filter(e => e.type === "step").length;
    const progress = Math.min(Math.round((completedSteps / totalSteps) * 100), 100);

    // Determine current step from most recent event
    const latestEvent = events[events.length - 1];
    const currentStep = latestEvent?.type === "step" 
      ? latestEvent.message 
      : latestEvent?.type === "error"
        ? "error"
        : "processing";

    // Determine overall status
    const hasError = events.some(e => e.type === "error");
    const status = hasError 
      ? "failed" 
      : progress >= 100 
        ? "completed" 
        : "processing";

    return NextResponse.json({
      status,
      progress,
      currentStep,
      events: events.map(e => ({
        type: e.type,
        message: e.message,
        filePath: e.filePath,
        preview: e.preview,
        createdAt: e.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching generation status:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
