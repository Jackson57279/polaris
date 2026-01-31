import { task } from "@trigger.dev/sdk/v3";

export const demoError = task({
  id: "demo-error",
  run: async () => {
    throw new Error("Trigger.dev error: Background job failed!");
  },
});
