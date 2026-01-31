import { z } from "zod";
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/stack-auth-api";
import { convex } from "@/lib/convex-client";
import { withRetry } from "@/lib/retry";
import { createSSEResponse, writeSSEEvent, SSEEvent } from "@/lib/streaming";
import { createFileTools } from "@/lib/ai-tools";
import { createLSPTools } from "@/lib/lsp-tools";
import { createSearchTools } from "@/lib/search-tools";
import { createTerminalTools } from "@/lib/terminal-tools";
import { createContextTools } from "@/lib/context-tools";
import { streamTextWithToolsPreferCerebras } from "@/lib/generate-text-with-tools";

import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

const requestSchema = z.object({
  conversationId: z.string(),
  message: z.string(),
});

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

Context & Relevance:
- getRelevantFiles: Find files most relevant to a query using import analysis, symbol matching, edit history, and file proximity

Terminal:
- executeCommand: Execute safe terminal commands (npm, bun, git, node, tsc, eslint, prettier, test, npx)

When the user asks you to create, modify, or delete files, use the file management tools.
When you need to understand code structure or find specific symbols, use the LSP and search tools.
When you need to find related files for context, use the context tools.
When you need to run build commands or tests, use the terminal tool.
When writing code, ensure it is well-structured, follows best practices, and includes proper error handling.

Be concise in your responses. Focus on helping the user accomplish their coding tasks.`;

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth();

  if (!user) {
    return response;
  }

  const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;

  if (!internalKey) {
    return new Response(
      JSON.stringify({ error: "Internal key not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await request.json();
    const { conversationId, message } = requestSchema.parse(body);

    // Get conversation context
    const conversation = await convex.query(api.system.getConversationById, {
      internalKey,
      conversationId: conversationId as Id<"conversations">,
    });

    if (!conversation) {
      return new Response(
        JSON.stringify({ error: "Conversation not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const projectId = conversation.projectId;

    // Check for existing processing messages
    const processingMessages = await convex.query(api.system.getProcessingMessages, {
      internalKey,
      projectId,
    });

    if (processingMessages.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: "A message is already being processed", 
          messageId: processingMessages[0]._id 
        }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create user message
    await convex.mutation(api.system.createMessage, {
      internalKey,
      conversationId: conversationId as Id<"conversations">,
      projectId,
      role: "user",
      content: message,
    });

    // Create placeholder assistant message
    const assistantMessageId = await convex.mutation(
      api.system.createMessage,
      {
        internalKey,
        conversationId: conversationId as Id<"conversations">,
        projectId,
        role: "assistant",
        content: "",
        status: "processing",
      }
    );

    // Create SSE stream
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    // Start processing in background
    const processMessage = async () => {
      try {
        const context = await convex.query(api.system.getMessageContext, {
          internalKey,
          messageId: assistantMessageId,
        });

        const fileTools = createFileTools(context.projectId, internalKey);
        const lspTools = createLSPTools(context.projectId, internalKey);
        const searchTools = createSearchTools(context.projectId, internalKey);
        const terminalTools = createTerminalTools(context.projectId, internalKey);
        const contextTools = createContextTools(context.projectId, internalKey);

        const tools = {
          ...fileTools,
          ...lspTools,
          ...searchTools,
          ...terminalTools,
          ...contextTools,
        };

        let lastStreamUpdate = 0;
        const STREAM_THROTTLE_MS = 100;
        let accumulatedText = "";

        // Use retry for the AI call
        await withRetry(
          async () => {
            const response = await streamTextWithToolsPreferCerebras({
              system: SYSTEM_PROMPT,
              messages: context.messages,
              tools,
              maxSteps: 10,
              maxTokens: 2000,
              onTextChunk: async (_chunk: string, fullText: string) => {
                accumulatedText = fullText;

                const now = Date.now();
                if (now - lastStreamUpdate >= STREAM_THROTTLE_MS) {
                  lastStreamUpdate = now;
                  await writeSSEEvent(writer, {
                    type: "text",
                    content: fullText,
                  });
                }
              },
              onStepFinish: async ({ toolCalls, toolResults }) => {
                if (toolCalls && toolCalls.length > 0) {
                  for (const toolCall of toolCalls) {
                    const tc = toolCall as {
                      toolCallId: string;
                      toolName: string;
                      args?: unknown;
                    };
                    await writeSSEEvent(writer, {
                      type: "toolCall",
                      toolCall: {
                        id: tc.toolCallId,
                        name: tc.toolName,
                        args: tc.args ?? {},
                      },
                    });
                    
                    // Also persist to Convex
                    await convex.mutation(api.system.appendToolCall, {
                      internalKey,
                      messageId: assistantMessageId,
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
                    await writeSSEEvent(writer, {
                      type: "toolResult",
                      toolResult: {
                        id: tr.toolCallId,
                        result: tr.result ?? null,
                      },
                    });
                    
                    // Also persist to Convex
                    await convex.mutation(api.system.appendToolResult, {
                      internalKey,
                      messageId: assistantMessageId,
                      toolCallId: tr.toolCallId,
                      result: tr.result ?? null,
                    });
                  }
                }
              },
            });

            // Final text update
            await writeSSEEvent(writer, {
              type: "text",
              content: response.text || "I've completed the task.",
            });

            // Persist final message to Convex
            await convex.mutation(api.system.streamMessageContent, {
              internalKey,
              messageId: assistantMessageId,
              content: response.text || "I've completed the task.",
              isComplete: true,
            });
          },
          {
            maxAttempts: 3,
            baseDelay: 1000,
            onRetry: (error, attempt) => {
              console.log(`[Retry] Attempt ${attempt} failed: ${error.message}`);
            },
          }
        );

        // Send completion event
        await writeSSEEvent(writer, { type: "complete" });
      } catch (error) {
        console.error("Error processing message:", error);

        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        // Send error event
        await writeSSEEvent(writer, {
          type: "error",
          error: errorMessage,
        });

        // Update message status to failed
        await convex.mutation(api.system.updateMessageContent, {
          internalKey,
          messageId: assistantMessageId,
          content: "My apologies, I encountered an error while processing your request. Let me know if you need anything else!",
          status: "failed",
        });
      } finally {
        await writer.close();
      }
    };

    // Start processing (don't await)
    processMessage();

    // Return SSE response immediately
    return createSSEResponse(readable);
  } catch (error) {
    console.error("Error in stream route:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
