import { serve } from "inngest/next";

import { inngest } from "@/inngest/client";
import { generateProject } from "@/inngest/functions";
import { processMessage } from "@/features/conversations/inngest/process-message";

// Create an API that serves all Inngest functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    generateProject,
    processMessage,
  ],
});