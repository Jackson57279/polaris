import { NonRetriableError } from "inngest";
import { createAgent } from "@inngest/agent-kit";

import { inngest } from "@/inngest/client";
import { createAgentFileTools } from "@/lib/agent-kit-tools";
import { createCerebrasModel, createOpenRouterModel } from "@/lib/agent-kit-provider";
import { convex } from "@/lib/convex-client";

import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

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

function getModel() {
  try {
    if (process.env.CEREBRAS_API_KEY) {
      return createCerebrasModel();
    }
  } catch {
    // Fall through to OpenRouter
  }
  return createOpenRouterModel();
}

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
      throw new NonRetriableError("POLARIS_CONVEX_INTERNAL_KEY is not configured");
    }

    const context = await step.run("get-message-context", async () => {
      return await convex.query(api.system.getMessageContext, {
        internalKey,
        messageId,
      });
    });

    const tools = createAgentFileTools({
      projectId: context.projectId,
      internalKey,
      convex,
    });

    const polarisAgent = createAgent({
      name: "polaris-assistant",
      description: "An AI coding assistant that helps with code tasks",
      system: SYSTEM_PROMPT,
      model: getModel(),
      tools,
      tool_choice: "auto",
    });

    const result = await step.run("generate-ai-response", async () => {
      const lastUserMessage = context.messages.length > 0
        ? context.messages[context.messages.length - 1]
        : null;

      const userInput = lastUserMessage?.content ?? "";

      const response = await polarisAgent.run(userInput, {
        model: getModel(),
        maxIter: 10,
      });

      for (const message of response.output) {
        if (message.type === "tool_call") {
          for (const tool of message.tools) {
            try {
              await convex.mutation(api.system.appendToolCall, {
                internalKey,
                messageId,
                toolCall: {
                  id: tool.id,
                  name: tool.name,
                  args: tool.input ?? {},
                },
              });
            } catch {
              // Best-effort logging
            }
          }
        }

        if (message.type === "tool_result") {
          try {
            await convex.mutation(api.system.appendToolResult, {
              internalKey,
              messageId,
              toolCallId: message.tool.id,
              result: message.content ?? null,
            });
          } catch {
            // Best-effort logging
          }
        }
      }

      const textOutput = response.output.find((m) => m.type === "text");
      if (!textOutput) {
        return "I've completed the task.";
      }
      
      if (textOutput.type === "text") {
        const content = textOutput.content;
        if (typeof content === "string") {
          return content;
        }
        if (Array.isArray(content)) {
          return content.map((c) => c.text).join("");
        }
      }
      
      return "I've completed the task.";
    });

    await step.run("update-assistant-message", async () => {
      await convex.mutation(api.system.updateMessageContent, {
        internalKey,
        messageId,
        content: result,
      });
    });
  }
);
