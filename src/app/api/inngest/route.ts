import { serve } from "inngest/next";

import { inngest } from "@/inngest/client";
import { demoError, demoGenerate, generateProject } from "@/inngest/functions";
import { processMessage } from "@/features/conversations/inngest/process-message";

// Create an API that serves all Inngest functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    generateProject,
    demoGenerate,
    demoError,
    processMessage,
  ],
});