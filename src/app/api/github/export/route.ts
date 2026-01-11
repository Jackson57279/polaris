import { z } from "zod";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/stack-auth-api";

import { convex } from "@/lib/convex-client";
import { createOctokit, getGithubToken, exportToRepository, parseGitHubUrl } from "@/lib/github";

import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

const requestSchema = z.object({
  projectId: z.string(),
  repoUrl: z.string().url(),
  commitMessage: z.string().optional(),
});

export async function POST(request: Request) {
  const { userId } = await auth();


  const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;

  if (!internalKey) {
    return NextResponse.json(
      { error: "Internal key not configured" },
      { status: 500 }
    );
  }

  const body = await request.json();
  const { projectId, repoUrl, commitMessage = "Update from Polaris" } = requestSchema.parse(body);

  const parsed = parseGitHubUrl(repoUrl);
  if (!parsed) {
    return NextResponse.json(
      { error: "Invalid GitHub URL" },
      { status: 400 }
    );
  }

  const { owner, repo } = parsed;

  const token = await getGithubToken(userId);
  if (!token) {
    return NextResponse.json(
      { error: "GitHub not connected. Please connect GitHub in your account settings." },
      { status: 403 }
    );
  }

  const octokit = createOctokit(token);

  try {
    await convex.mutation(api.system.updateProjectExportStatus, {
      internalKey,
      projectId: projectId as Id<"projects">,
      status: "exporting",
      repoUrl,
    });

    const allFiles = await convex.query(api.system.getAllProjectFiles, {
      internalKey,
      projectId: projectId as Id<"projects">,
    });

    const filesToExport = allFiles
      .filter((f) => f.type === "file" && f.content)
      .map((f) => ({
        path: f.path,
        content: f.content!,
      }));

    await exportToRepository(octokit, owner, repo, filesToExport, commitMessage);

    await convex.mutation(api.system.updateProjectExportStatus, {
      internalKey,
      projectId: projectId as Id<"projects">,
      status: "completed",
      repoUrl,
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Export failed:", error);

    await convex.mutation(api.system.updateProjectExportStatus, {
      internalKey,
      projectId: projectId as Id<"projects">,
      status: "failed",
      repoUrl,
    });

    return NextResponse.json(
      { error: "Failed to export repository" },
      { status: 500 }
    );
  }
}
