import { z } from "zod";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/stack-auth-api";
import { convex } from "@/lib/convex-client";

import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import JSZip from "jszip";

const requestSchema = z.object({
  projectId: z.string(),
});

export async function POST(request: Request) {
  const { user, userId, response } = await requireAuth();

  if (!user) {
    return response;
  }

  const body = await request.json();
  const { projectId } = requestSchema.parse(body);

  const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;
  if (!internalKey) {
    return NextResponse.json(
      { error: "Internal key not configured" },
      { status: 500 }
    );
  }

  try {
    // Get project info
    const project = await convex.query(api.projects.getProjectById, {
      projectId: projectId as Id<"projects">,
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.ownerId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get all files
    const allFiles = await convex.query(api.system.getAllProjectFiles, {
      internalKey,
      projectId: projectId as Id<"projects">,
    });

    // Create ZIP file
    const zip = new JSZip();

    for (const file of allFiles) {
      if (file.type === "file" && file.content) {
        zip.file(file.path, file.content);
      }
    }

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    // Return ZIP file
    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${project.name}.zip"`,
      },
    });
  } catch (error) {
    console.error("Export failed:", error);
    return NextResponse.json(
      { error: "Failed to export project" },
      { status: 500 }
    );
  }
}
