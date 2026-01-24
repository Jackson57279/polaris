import { openai } from "@inngest/agent-kit";

const CEREBRAS_BASE_URL = "https://api.cerebras.ai/v1/";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/";

export const CEREBRAS_MODEL = "llama-4-scout-17b-16e-instruct";
export const OPENROUTER_FALLBACK_MODEL = "z-ai/glm-4.7";

export function createCerebrasModel() {
  return openai({
    model: CEREBRAS_MODEL,
    apiKey: process.env.CEREBRAS_API_KEY,
    baseUrl: CEREBRAS_BASE_URL,
    defaultParameters: {
      temperature: 0.7,
      max_completion_tokens: 2000,
    },
  });
}

export function createOpenRouterModel(model: string = OPENROUTER_FALLBACK_MODEL) {
  return openai({
    model,
    apiKey: process.env.OPENROUTER_API_KEY,
    baseUrl: OPENROUTER_BASE_URL,
    defaultParameters: {
      temperature: 0.7,
      max_completion_tokens: 2000,
    },
  });
}

export function getPrimaryModel() {
  if (process.env.CEREBRAS_API_KEY) {
    return createCerebrasModel();
  }
  return createOpenRouterModel();
}

export function getFallbackModel() {
  return createOpenRouterModel();
}

export interface GenerateTextResult {
  data: string;
  provider: "cerebras" | "openrouter";
  model: string;
}

async function makeOpenAIRequest(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  options?: { temperature?: number; max_tokens?: number }
): Promise<string> {
  const response = await fetch(`${baseUrl}chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? 2000,
    }),
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export async function generateText(
  messages: Array<{ role: string; content: string }>,
  options?: { temperature?: number; max_tokens?: number }
): Promise<GenerateTextResult> {
  if (process.env.CEREBRAS_API_KEY) {
    try {
      const content = await makeOpenAIRequest(
        CEREBRAS_BASE_URL,
        process.env.CEREBRAS_API_KEY,
        CEREBRAS_MODEL,
        messages,
        options
      );
      return { data: content, provider: "cerebras", model: CEREBRAS_MODEL };
    } catch {
      // Fall through to OpenRouter
    }
  }

  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("No AI provider configured");
  }

  const content = await makeOpenAIRequest(
    OPENROUTER_BASE_URL,
    process.env.OPENROUTER_API_KEY,
    OPENROUTER_FALLBACK_MODEL,
    messages,
    options
  );
  return { data: content, provider: "openrouter", model: OPENROUTER_FALLBACK_MODEL };
}
