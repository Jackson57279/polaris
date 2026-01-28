import { LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import {
  Cerebras,
  createCerebrasCompletion,
  CEREBRAS_MODEL,
} from "./cerebras-provider";
import { logProviderEvent, type ProviderMetadata } from "./ai-provider-utils";

const openrouter = createAnthropic({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  headers: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "X-Title": "Polaris IDE",
  },
});

const PRIMARY_MODEL = "moonshotai/kimi-k2.5";
const FALLBACK_MODEL = "zai-glm-4.7";

export interface AIProviderResult<T> {
  data: T;
  metadata: ProviderMetadata;
}

export async function generateWithFallback(
  messages: Array<{ role: string; content: string }>,
  options?: {
    temperature?: number;
    max_tokens?: number;
  }
): Promise<AIProviderResult<string>> {
  try {
    logProviderEvent("Attempting OpenRouter Kimi K2.5");
    const { generateText } = await import("ai");
    const response = await generateText({
      model: openrouter(PRIMARY_MODEL),
      messages: messages.map((m) => ({
        role: m.role as "system" | "user" | "assistant",
        content: m.content,
      })),
      temperature: options?.temperature ?? 0.7,
      maxOutputTokens: options?.max_tokens ?? 2000,
    });
    
    return {
      data: response.text,
      metadata: {
        provider: "openrouter",
        model: PRIMARY_MODEL,
        usedFallback: false,
      },
    };
  } catch (error) {
    logProviderEvent(
      "OpenRouter error, falling back to Cerebras GLM-4.7",
      { error }
    );

    const response = await createCerebrasCompletion(messages, options);

    return {
      data: response.choices[0]?.message?.content || "",
      metadata: {
        provider: "cerebras",
        model: CEREBRAS_MODEL,
        usedFallback: true,
      },
    };
  }
}

export function getCerebrasModel(): LanguageModel {
  throw new Error(
    "Direct Cerebras model not available for AI SDK. Use OpenRouter model instead."
  );
}

export function getOpenRouterModel(modelId: string): LanguageModel {
  return openrouter(modelId);
}

export function getDefaultModel(): LanguageModel {
  return openrouter(PRIMARY_MODEL);
}
