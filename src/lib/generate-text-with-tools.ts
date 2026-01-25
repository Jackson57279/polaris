import {
  asSchema,
  generateText,
  streamText,
  stepCountIs,
  type ModelMessage,
  type Tool,
  type ToolChoice,
} from "ai";
import Cerebras from "@cerebras/cerebras_cloud_sdk";

import { getOpenRouterModel } from "./ai-providers";
import { logProviderEvent } from "./ai-provider-utils";
import { CEREBRAS_MODEL } from "./cerebras-provider";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ToolSet = Record<string, Tool<any, any>>;

export interface GenerateTextWithToolsOptions<TOOLS extends ToolSet = ToolSet> {
  system?: string;
  messages: Array<ModelMessage>;
  tools: TOOLS;
  temperature?: number;
  maxTokens?: number;
  maxSteps?: number;
  toolChoice?: ToolChoice<TOOLS> | ((step: number) => ToolChoice<TOOLS>);
  onStepFinish?: (options: {
    text?: string;
    toolCalls?: unknown[];
    toolResults?: unknown[];
  }) => Promise<void> | void;
}

export interface GenerateTextWithToolsResult {
  text: string;
  provider: "cerebras" | "openrouter";
  model: string;
  usedFallback: boolean;
}

const DEFAULT_OPENROUTER_MODEL = "z-ai/glm-4.7";

type OpenAIToolCall = {
  id: string;
  function?: {
    name?: string;
    arguments?: unknown;
  };
};

type CerebrasChatCompletion = {
  choices?: Array<{
    message?: {
      content?: string | null;
      tool_calls?: OpenAIToolCall[];
    };
  }>;
};

function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<PropertyKey, unknown>;
  return typeof record[Symbol.asyncIterator] === "function";
}

async function resolveToolResult(result: unknown): Promise<unknown> {
  if (!isAsyncIterable(result)) {
    return result;
  }

  const chunks: unknown[] = [];
  for await (const chunk of result) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return "";
  }

  if (chunks.every((c) => typeof c === "string")) {
    return (chunks as string[]).join("");
  }

  return chunks.length === 1 ? chunks[0] : chunks;
}

function parseToolArguments(args: unknown): unknown {
  if (typeof args === "string") {
    try {
      return JSON.parse(args);
    } catch {
      return {};
    }
  }

  if (typeof args === "object" && args !== null) {
    return args;
  }

  return {};
}

function toOpenAIToolChoice<TOOLS extends ToolSet>(
  toolChoice: ToolChoice<TOOLS>
): unknown {
  switch (toolChoice) {
    case "auto":
    case "none":
    case "required":
      return toolChoice;
    default:
      return {
        type: "function",
        function: {
          name: toolChoice.toolName,
        },
      };
  }
}

async function buildOpenAITools(toolSet: ToolSet): Promise<Array<unknown>> {
  const entries = Object.entries(toolSet);

  return await Promise.all(
    entries.map(async ([name, tool]) => {
      const schema = asSchema(tool.inputSchema);
      const parameters = await schema.jsonSchema;

      return {
        type: "function",
        function: {
          name,
          description: tool.description,
          parameters,
        },
      };
    })
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getToolExecute(tool: Tool<any, any>):
  | ((
      input: unknown,
      options: { toolCallId: string; messages: ModelMessage[] }
    ) => unknown)
  | null {
  const execute = (tool as { execute?: unknown }).execute;

  if (typeof execute !== "function") {
    return null;
  }

  return execute as (
    input: unknown,
    options: { toolCallId: string; messages: ModelMessage[] }
  ) => unknown;
}

async function generateWithCerebrasTools<TOOLS extends ToolSet>(
  options: GenerateTextWithToolsOptions<TOOLS>
): Promise<GenerateTextWithToolsResult> {
  const apiKey = process.env.CEREBRAS_API_KEY;

  if (!apiKey) {
    throw new Error("CEREBRAS_API_KEY is not configured");
  }

  const client = new Cerebras({ apiKey });

  const openAiTools = await buildOpenAITools(options.tools);

  const maxSteps = options.maxSteps ?? 10;
  const maxTokens = options.maxTokens ?? 2000;
  const temperature = options.temperature ?? 0.7;

  const history: unknown[] = [
    ...(options.system ? [{ role: "system", content: options.system }] : []),
    ...options.messages,
  ];

  let lastText = "";

  for (let step = 0; step < maxSteps; step++) {
    const toolChoice =
      typeof options.toolChoice === "function"
        ? options.toolChoice(step)
        : options.toolChoice ?? "auto";

    logProviderEvent("Cerebras: generating", {
      model: CEREBRAS_MODEL,
      step,
      toolChoice,
    });

    const create = client.chat.completions.create as unknown as (
      params: Record<string, unknown>
    ) => Promise<unknown>;

    const response = (await create({
      model: CEREBRAS_MODEL,
      messages: history,
      tools: openAiTools,
      tool_choice: toOpenAIToolChoice(toolChoice),
      temperature,
      max_tokens: maxTokens,
    })) as CerebrasChatCompletion;

    const message = response.choices?.[0]?.message;

    const content = typeof message?.content === "string" ? message.content : "";
    lastText = content || lastText;

    const toolCalls = Array.isArray(message?.tool_calls) ? message.tool_calls : [];

    history.push({
      role: "assistant",
      content,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
    });

    if (toolCalls.length === 0) {
      await options.onStepFinish?.({ text: content, toolCalls: [], toolResults: [] });
      break;
    }

    const executedToolCalls: unknown[] = [];
    const executedToolResults: unknown[] = [];

    // Helper to extract file path from tool arguments
    const getFilePath = (args: unknown): string | null => {
      if (typeof args === "object" && args !== null) {
        const obj = args as Record<string, unknown>;
        return (obj.path as string) || (obj.filePath as string) || null;
      }
      return null;
    };

    // Group tools by dependency (same file path = dependent)
    const toolGroups: OpenAIToolCall[][] = [];
    const usedPaths = new Set<string>();
    
    for (const toolCall of toolCalls) {
      const args = parseToolArguments(toolCall.function?.arguments);
      const filePath = getFilePath(args);
      
      // If tool operates on a file we've already seen, it's dependent
      if (filePath && usedPaths.has(filePath)) {
        // Add to last group (sequential with previous operation on same file)
        if (toolGroups.length > 0) {
          toolGroups[toolGroups.length - 1].push(toolCall);
        } else {
          toolGroups.push([toolCall]);
        }
      } else {
        // Independent tool - can run in parallel with others
        toolGroups.push([toolCall]);
        if (filePath) usedPaths.add(filePath);
      }
    }

    // Execute tool groups (parallel within group, sequential between groups)
    for (const group of toolGroups) {
      const groupPromises = group.map(async (toolCall) => {
        const toolCallId = toolCall.id;
        const toolName = toolCall.function?.name;
        const tool = toolName ? options.tools[toolName] : undefined;
        const args = parseToolArguments(toolCall.function?.arguments);

        executedToolCalls.push({ toolCallId, toolName, args });

        if (!tool) {
          const error = `Tool not found: ${toolName}`;
          return { toolCallId, result: error, isError: true };
        }

        const execute = getToolExecute(tool);

        if (!execute) {
          const error = `Tool not executable: ${toolName}`;
          return { toolCallId, result: error, isError: true };
        }

        try {
          const rawResult = execute(args, {
            toolCallId,
            messages: options.messages,
          });

          const result = await resolveToolResult(rawResult);
          return { toolCallId, result, isError: false };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return { toolCallId, result: { error: errorMessage }, isError: true };
        }
      });

      // Execute group in parallel
      const groupResults = await Promise.all(groupPromises);

      // Process results and update history
      for (const { toolCallId, result, isError } of groupResults) {
        executedToolResults.push({ toolCallId, result });

        let toolContent: string;
        if (isError) {
          toolContent = typeof result === "string" ? result : `Error: ${JSON.stringify(result)}`;
        } else {
          try {
            toolContent = typeof result === "string" ? result : JSON.stringify(result);
          } catch {
            toolContent = "[unserializable tool result]";
          }
        }

        history.push({
          role: "tool",
          tool_call_id: toolCallId,
          content: toolContent,
        });
      }
    }

    await options.onStepFinish?.({
      text: content,
      toolCalls: executedToolCalls,
      toolResults: executedToolResults,
    });
  }

  return {
    text: lastText,
    provider: "cerebras",
    model: CEREBRAS_MODEL,
    usedFallback: false,
  };
}

export async function generateTextWithToolsPreferCerebras<TOOLS extends ToolSet>(
  options: GenerateTextWithToolsOptions<TOOLS>
): Promise<GenerateTextWithToolsResult> {
  try {
    return await generateWithCerebrasTools(options);
  } catch (error) {
    if (error instanceof Cerebras.RateLimitError) {
      logProviderEvent("Cerebras rate limit hit, falling back to OpenRouter", {
        error,
      });
    } else {
      logProviderEvent("Cerebras failed, falling back to OpenRouter", { error });
    }

    const toolChoiceFn =
      typeof options.toolChoice === "function" ? options.toolChoice : undefined;

    const response = await generateText({
      model: getOpenRouterModel(DEFAULT_OPENROUTER_MODEL),
      system: options.system,
      messages: options.messages,
      tools: options.tools,
      toolChoice: toolChoiceFn
        ? undefined
        : (options.toolChoice as Exclude<typeof options.toolChoice, Function>),
      prepareStep: toolChoiceFn
        ? async ({ stepNumber }) => ({ toolChoice: toolChoiceFn(stepNumber) })
        : undefined,
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 2000,
      stopWhen: stepCountIs(options.maxSteps ?? 10),
      onStepFinish: async ({ text, toolCalls, toolResults }) => {
        await options.onStepFinish?.({ text, toolCalls, toolResults });
      },
    });

    return {
      text: response.text,
      provider: "openrouter",
      model: DEFAULT_OPENROUTER_MODEL,
      usedFallback: true,
    };
  }
}

export interface StreamTextWithToolsOptions<TOOLS extends ToolSet = ToolSet> {
  system?: string;
  messages: Array<ModelMessage>;
  tools: TOOLS;
  temperature?: number;
  maxTokens?: number;
  maxSteps?: number;
  toolChoice?: ToolChoice<TOOLS> | ((step: number) => ToolChoice<TOOLS>);
  onTextChunk?: (text: string, fullText: string) => Promise<void> | void;
  onStepFinish?: (options: {
    text?: string;
    toolCalls?: unknown[];
    toolResults?: unknown[];
  }) => Promise<void> | void;
}

export async function streamTextWithToolsPreferCerebras<TOOLS extends ToolSet>(
  options: StreamTextWithToolsOptions<TOOLS>
): Promise<GenerateTextWithToolsResult> {
  const toolChoiceFn =
    typeof options.toolChoice === "function" ? options.toolChoice : undefined;

  logProviderEvent("Starting streaming with OpenRouter", {
    model: DEFAULT_OPENROUTER_MODEL,
  });

  type ToolChoiceFn = (step: number) => ToolChoice<TOOLS>;
  const result = streamText({
    model: getOpenRouterModel(DEFAULT_OPENROUTER_MODEL),
    system: options.system,
    messages: options.messages,
    tools: options.tools,
    toolChoice: toolChoiceFn
      ? undefined
      : (options.toolChoice as Exclude<typeof options.toolChoice, ToolChoiceFn>),
    prepareStep: toolChoiceFn
      ? async ({ stepNumber }) => ({ toolChoice: toolChoiceFn(stepNumber) })
      : undefined,
    temperature: options.temperature ?? 0.7,
    maxOutputTokens: options.maxTokens ?? 2000,
    stopWhen: stepCountIs(options.maxSteps ?? 10),
    onStepFinish: async ({ text, toolCalls, toolResults }) => {
      await options.onStepFinish?.({ text, toolCalls, toolResults });
    },
  });

  let fullText = "";

  for await (const chunk of result.textStream) {
    fullText += chunk;
    await options.onTextChunk?.(chunk, fullText);
  }

  return {
    text: fullText,
    provider: "openrouter",
    model: DEFAULT_OPENROUTER_MODEL,
    usedFallback: false,
  };
}
