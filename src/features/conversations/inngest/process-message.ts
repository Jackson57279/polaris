import { NonRetriableError } from "inngest";

import { inngest } from "@/inngest/client";
import { createFileTools } from "@/lib/ai-tools";
import { createLSPTools } from "@/lib/lsp-tools";
import { createSearchTools } from "@/lib/search-tools";
import { createTerminalTools } from "@/lib/terminal-tools";
import { convex } from "@/lib/convex-client";
import { streamTextWithToolsPreferCerebras } from "@/lib/generate-text-with-tools";

import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

interface MessageEvent {
  messageId: Id<"messages">;
}

const SYSTEM_PROMPT = `You are Polaris, an AI coding assistant integrated into a cloud IDE. You help users write, edit, and understand code.

You have access to the following tools to work with the user's project files:

File Management:
- readFile: Read the contents of a file
- writeFile: Create or update a file (parent folders are created automatically)
- deleteFile: Delete a file or folder
- listFiles: List files in a directory
- getProjectStructure: Get the complete file tree of the project

Code Analysis (LSP):
- findSymbol: Search for functions, classes, variables, interfaces, types by name
- getReferences: Find all references to a symbol at a specific location
- getDiagnostics: Get TypeScript errors, warnings, and suggestions for a file
- goToDefinition: Find where a symbol is defined

Code Search:
- searchFiles: Search file contents using regex patterns
- searchCodebase: AST-aware search for imports, functions, classes, variables, exports, calls
- findFilesByPattern: Find files by name using glob patterns

Terminal:
- executeCommand: Execute safe terminal commands (npm, bun, git, node, tsc, eslint, prettier, test, npx)

When the user asks you to create, modify, or delete files, use the file management tools.
When you need to understand code structure or find specific symbols, use the LSP and search tools.
When you need to run build commands or tests, use the terminal tool.
When writing code, ensure it is well-structured, follows best practices, and includes proper error handling.

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
      throw new NonRetriableError("POLARIS_CONVEX_INTERNAL_KEY is not configured");
    }

    const context = await step.run("get-message-context", async () => {
      return await convex.query(api.system.getMessageContext, {
        internalKey,
        messageId,
      });
    });

    const fileTools = createFileTools(context.projectId, internalKey);
    const lspTools = createLSPTools(context.projectId, internalKey);
    const searchTools = createSearchTools(context.projectId, internalKey);
    const terminalTools = createTerminalTools(context.projectId, internalKey);

    const tools = {
      ...fileTools,
      ...lspTools,
      ...searchTools,
      ...terminalTools,
    };

    let lastStreamUpdate = 0;
    const STREAM_THROTTLE_MS = 100;

    const result = await step.run("generate-ai-response", async () => {
      const response = await streamTextWithToolsPreferCerebras({
        system: SYSTEM_PROMPT,
        messages: context.messages,
        tools,
        maxSteps: 10,
        maxTokens: 2000,
        onTextChunk: async (_chunk: string, fullText: string) => {
          const now = Date.now();
          if (now - lastStreamUpdate >= STREAM_THROTTLE_MS) {
            lastStreamUpdate = now;
            await convex.mutation(api.system.streamMessageContent, {
              internalKey,
              messageId,
              content: fullText,
              isComplete: false,
            });
          }
        },
        onStepFinish: async ({ toolCalls, toolResults }: { toolCalls?: unknown[]; toolResults?: unknown[] }) => {
          if (toolCalls && toolCalls.length > 0) {
            for (const toolCall of toolCalls) {
              const tc = toolCall as {
                toolCallId: string;
                toolName: string;
                args?: unknown;
              };
              await convex.mutation(api.system.appendToolCall, {
                internalKey,
                messageId,
                toolCall: {
                  id: tc.toolCallId,
                  name: tc.toolName,
                  args: tc.args ?? {},
                },
              });
            }
          }

          if (toolResults && toolResults.length > 0) {
            for (const toolResult of toolResults) {
              const tr = toolResult as {
                toolCallId: string;
                result?: unknown;
              };
              await convex.mutation(api.system.appendToolResult, {
                internalKey,
                messageId,
                toolCallId: tr.toolCallId,
                result: tr.result ?? null,
              });
            }
          }
        },
      });

      return response.text;
    });

    await step.run("update-assistant-message", async () => {
      await convex.mutation(api.system.streamMessageContent, {
        internalKey,
        messageId,
        content: result || "I've completed the task.",
        isComplete: true,
      });
    });
  }
);
