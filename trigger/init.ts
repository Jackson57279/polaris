import { tasks } from "@trigger.dev/sdk/v3";
import * as Sentry from "@sentry/node";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
  });
}

tasks.onFailure(async ({ payload, error, ctx }) => {
  console.error(`Task ${ctx.task.id} failed:`, error);
  
  Sentry.captureException(error, {
    extra: {
      taskId: ctx.task.id,
      runId: ctx.run.id,
      payload,
    },
  });
});
