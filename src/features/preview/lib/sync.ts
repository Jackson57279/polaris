import type { WebContainer, FileSystemTree, DirectoryNode } from "@webcontainer/api";

interface FileEntry {
  path: string;
  content: string;
  type: "file" | "folder";
}

export function buildFileSystemTree(files: FileEntry[]): FileSystemTree {
  const tree: FileSystemTree = {};

  for (const file of files) {
    const segments = file.path.split("/").filter(Boolean);
    let current = tree;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const isLast = i === segments.length - 1;

      if (isLast && file.type === "file") {
        current[segment] = { file: { contents: file.content ?? "" } };
      } else {
        if (!current[segment]) {
          current[segment] = { directory: {} };
        }
        current = (current[segment] as DirectoryNode).directory;
      }
    }
  }

  return tree;
}

export async function syncFilesToContainer(
  container: WebContainer,
  files: FileEntry[]
): Promise<void> {
  const tree = buildFileSystemTree(files);
  await container.mount(tree);
}

export async function writeFileToContainer(
  container: WebContainer,
  path: string,
  content: string
): Promise<void> {
  await container.fs.writeFile(path, content);
}

export async function readFileFromContainer(
  container: WebContainer,
  path: string
): Promise<string> {
  return await container.fs.readFile(path, "utf-8");
}

export async function deleteFileFromContainer(
  container: WebContainer,
  path: string
): Promise<void> {
  await container.fs.rm(path, { recursive: true, force: true });
}
