import { z } from "zod";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/stack-auth-api";
import { ConvexHttpClient } from "convex/browser";
import JSZip from "jszip";

import { api } from "../../../../../convex/_generated/api";
import { checkAccess, trackUsage } from "@/lib/autumn-server";

const FEATURE_ID = 'projects';

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

  const convexToken = await getToken();
  if (!convexToken) {
    return NextResponse.json(
      { error: "Failed to get authentication token" },
      { status: 401 }
    );
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  convex.setAuth(convexToken);

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const projectName = formData.get("projectName") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.endsWith(".zip")) {
      return NextResponse.json(
        { error: "Only ZIP files are supported" },
        { status: 400 }
      );
    }

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

    // Extract ZIP file
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    const projectId = await convex.mutation(api.projects.create, {
      name: projectName || file.name.replace(".zip", ""),
    });

    // Import all files
    for (const [path, zipEntry] of Object.entries(zip.files)) {
      if (zipEntry.dir) continue;

      const content = await zipEntry.async("text");

      await convex.mutation(api.system.writeFileByPath, {
        internalKey,
        projectId,
        path,
        content,
      });
    }

    await trackUsage(userId, FEATURE_ID, 1);

    return NextResponse.json({
      success: true,
      projectId,
    });
  } catch (error) {
    console.error("Import failed:", error);
    return NextResponse.json(
      { error: "Failed to import project" },
      { status: 500 }
    );
  }
}
