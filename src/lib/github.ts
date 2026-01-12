import { Octokit } from "@octokit/rest";
import { stackServerApp } from "@/stack/server";

export function createOctokit(accessToken: string) {
  return new Octokit({ auth: accessToken });
}

export async function getGithubToken(userId: string): Promise<string | null> {
  try {
    const user = await stackServerApp.getUser(userId);
    if (!user) {
      return null;
    }

    const connectedAccount = await user.getConnectedAccount("github");
    if (!connectedAccount) {
      return null;
    }

    const accessTokenData = await connectedAccount.getAccessToken();
    return accessTokenData?.accessToken ?? null;
  } catch {
    return null;
  }
}

interface RepoFile {
  path: string;
  content: string;
  type: "file" | "folder";
}

export async function importRepository(
  octokit: Octokit,
  owner: string,
  repo: string,
  path = ""
): Promise<RepoFile[]> {
  const files: RepoFile[] = [];

  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path });

    const items = Array.isArray(data) ? data : [data];

    for (const item of items) {
      if (item.type === "dir") {
        files.push({ path: item.path, content: "", type: "folder" });
        const children = await importRepository(octokit, owner, repo, item.path);
        files.push(...children);
      } else if (item.type === "file" && item.size < 1_000_000) {
        const { data: fileData } = await octokit.repos.getContent({
          owner,
          repo,
          path: item.path,
        });

        if ("content" in fileData && fileData.content) {
          const content = Buffer.from(fileData.content, "base64").toString("utf-8");
          files.push({
            path: item.path,
            content,
            type: "file",
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error importing ${path}:`, error);
  }

  return files;
}

export async function exportToRepository(
  octokit: Octokit,
  owner: string,
  repo: string,
  files: Array<{ path: string; content: string }>,
  commitMessage: string,
  branch = "main"
): Promise<void> {
  const { data: ref } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  });
  const latestCommitSha = ref.object.sha;

  const blobs = await Promise.all(
    files.map(async (file) => {
      const { data } = await octokit.git.createBlob({
        owner,
        repo,
        content: Buffer.from(file.content).toString("base64"),
        encoding: "base64",
      });
      return { path: file.path, sha: data.sha };
    })
  );

  const { data: tree } = await octokit.git.createTree({
    owner,
    repo,
    base_tree: latestCommitSha,
    tree: blobs.map((b) => ({
      path: b.path,
      mode: "100644" as const,
      type: "blob" as const,
      sha: b.sha,
    })),
  });

  const { data: commit } = await octokit.git.createCommit({
    owner,
    repo,
    message: commitMessage,
    tree: tree.sha,
    parents: [latestCommitSha],
  });

  await octokit.git.updateRef({
    owner,
    repo,
    ref: `heads/${branch}`,
    sha: commit.sha,
  });
}

export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}
