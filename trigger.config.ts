import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "polaris",
  runtime: "node",
  maxDuration: 3600,
  build: {
    extensions: [],
  },
  dirs: ["./trigger/tasks"],
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      factor: 2,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 60000,
      randomize: true,
    },
  },
});
