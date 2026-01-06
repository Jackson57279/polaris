import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";

import { createOctokit, getGithubToken, importRepository, parseGitHubUrl } from "@/lib/github";

import { api } from "../../../../../convex/_generated/api";

const requestSchema = z.object({
  repoUrl: z.string().url(),
});

export async function POST(request: Request) {
  const { userId, getToken } = await auth();

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

  const convexToken = await getToken({ template: "convex" });
  if (!convexToken) {
    return NextResponse.json(
      { error: "Failed to get authentication token" },
      { status: 401 }
    );
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  convex.setAuth(convexToken);

  const body = await request.json();
  const { repoUrl } = requestSchema.parse(body);

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
    const projectId = await convex.mutation(api.projects.create, {
      name: repo,
    });

    await convex.mutation(api.system.updateProjectImportStatus, {
      internalKey,
      projectId,
      status: "importing",
    });

    const files = await importRepository(octokit, owner, repo);

    for (const file of files) {
      if (file.type === "file") {
        await convex.mutation(api.system.writeFileByPath, {
          internalKey,
          projectId,
          path: file.path,
          content: file.content,
        });
      }
    }

    await convex.mutation(api.system.updateProjectImportStatus, {
      internalKey,
      projectId,
      status: "completed",
    });

    return NextResponse.json({
      success: true,
      projectId,
    });
  } catch (error) {
    console.error("Import failed:", error);
    return NextResponse.json(
      { error: "Failed to import repository" },
      { status: 500 }
    );
  }
}
