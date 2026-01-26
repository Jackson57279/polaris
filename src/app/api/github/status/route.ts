import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/stack-auth-api";
import { createOctokit, getGithubToken, validateGitHubToken } from "@/lib/github";

export async function GET(request: Request) {
  const { user, userId, response } = await requireAuth();

  if (!user) {
    return response;
  }

  try {
    const token = await getGithubToken(userId);

    if (!token) {
      return NextResponse.json({ connected: false });
    }

    const octokit = createOctokit(token);
    const validation = await validateGitHubToken(octokit);

    if (!validation.valid) {
      return NextResponse.json({
        connected: false,
        error: validation.error,
      });
    }

    return NextResponse.json({
      connected: true,
      username: validation.username,
    });
  } catch (error) {
    console.error("GitHub status check failed:", error);
    return NextResponse.json(
      { connected: false, error: "Failed to check GitHub status" },
      { status: 500 }
    );
  }
}
