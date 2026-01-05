import { WebContainer } from "@webcontainer/api";

let containerPromise: Promise<WebContainer> | null = null;

export async function getWebContainer(): Promise<WebContainer> {
  if (!containerPromise) {
    containerPromise = WebContainer.boot();
  }
  return containerPromise;
}

export async function teardownWebContainer(): Promise<void> {
  if (containerPromise) {
    const container = await containerPromise;
    container.teardown();
    containerPromise = null;
  }
}
