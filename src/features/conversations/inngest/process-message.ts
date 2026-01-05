import { generateText, stepCountIs } from "ai";
import { NonRetriableError } from "inngest";

import { inngest } from "@/inngest/client";
import { convex } from "@/lib/convex-client";
import { anthropic } from "@/lib/ai-providers";
import { createFileTools } from "@/lib/ai-tools";

import { Id } from "../../../../convex/_generated/dataModel";
import { api } from "../../../../convex/_generated/api";

interface MessageEvent {
  messageId: Id<"messages">;
}

const SYSTEM_PROMPT = `You are Polaris, an AI coding assistant integrated into a cloud IDE. You help users write, edit, and understand code.

You have access to the following tools to work with the user's project files:
- readFile: Read the contents of a file
- writeFile: Create or update a file (parent folders are created automatically)
- deleteFile: Delete a file or folder
- listFiles: List files in a directory
- getProjectStructure: Get the complete file tree of the project

When the user asks you to create, modify, or delete files, use these tools to make the changes.
When writing code, ensure it is well-structured, follows best practices, and includes proper error handling.
If you need to understand the project structure before making changes, use getProjectStructure or listFiles first.

Be concise in your responses. Focus on helping the user accomplish their coding tasks.`;

export const processMessage = inngest.createFunction(
  {
    id: "process-message",
    cancelOn: [
      {
        event: "message/cancel",
        if: "event.data.messageId == async.data.messageId",
      },
    ],
    onFailure: async ({ event, step }) => {
      const { messageId } = event.data.event.data as MessageEvent;
      const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;

      if (internalKey) {
        await step.run("update-message-on-failure", async () => {
          await convex.mutation(api.system.updateMessageContent, {
            internalKey,
            messageId,
            content:
              "My apologies, I encountered an error while processing your request. Let me know if you need anything else!",
          });
        });
      }
    },
  },
  {
    event: "message/sent",
  },
  async ({ event, step }) => {
    const { messageId } = event.data as MessageEvent;

    const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;

    if (!internalKey) {
      throw new NonRetriableError(
        "POLARIS_CONVEX_INTERNAL_KEY is not configured"
      );
    }

    const context = await step.run("get-message-context", async () => {
      return await convex.query(api.system.getMessageContext, {
        internalKey,
        messageId,
      });
    });

    const tools = createFileTools(context.projectId, internalKey);

    const result = await step.run("generate-ai-response", async () => {
      const response = await generateText({
        model: anthropic("anthropic/claude-sonnet-4-20250514"),
        system: SYSTEM_PROMPT,
        messages: context.messages,
        tools,
        stopWhen: stepCountIs(10),
        onStepFinish: async ({ toolCalls, toolResults }) => {
          if (toolCalls && toolCalls.length > 0) {
            for (const toolCall of toolCalls) {
              const args = "args" in toolCall ? toolCall.args : {};
              await convex.mutation(api.system.appendToolCall, {
                internalKey,
                messageId,
                toolCall: {
                  id: toolCall.toolCallId,
                  name: toolCall.toolName,
                  args,
                },
              });
            }
          }

          if (toolResults && toolResults.length > 0) {
            for (const toolResult of toolResults) {
              const result = "result" in toolResult ? toolResult.result : null;
              await convex.mutation(api.system.appendToolResult, {
                internalKey,
                messageId,
                toolCallId: toolResult.toolCallId,
                result,
              });
            }
          }
        },
      });

      return response.text;
    });

    await step.run("update-assistant-message", async () => {
      await convex.mutation(api.system.updateMessageContent, {
        internalKey,
        messageId,
        content: result || "I've completed the task.",
      });
    });
  }
);
