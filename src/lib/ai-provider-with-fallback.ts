import { LanguageModel } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  Cerebras,
  createCerebrasCompletion,
  CEREBRAS_MODEL,
} from "./cerebras-provider";
import { logProviderEvent, type ProviderMetadata } from "./ai-provider-utils";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "X-Title": "Polaris IDE",
  },
});

const FALLBACK_MODEL = "z-ai/glm-4.7"

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
    logProviderEvent("Attempting Cerebras GLM-4.7");
    const response = await createCerebrasCompletion(messages, options);
    
    return {
      data: response.choices[0]?.message?.content || "",
      metadata: {
        provider: "cerebras",
        model: CEREBRAS_MODEL,
        usedFallback: false,
      },
    };
  } catch (error) {
    const isRateLimit = error instanceof Cerebras.RateLimitError;
    logProviderEvent(
      isRateLimit
        ? "Rate limit hit, falling back to OpenRouter"
        : "Cerebras error, falling back to OpenRouter",
      { error }
    );

    const { generateText } = await import("ai");
    const response = await generateText({
      model: openrouter.chat(FALLBACK_MODEL),
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
        model: FALLBACK_MODEL,
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
  return openrouter.chat(modelId);
}

export function getDefaultModel(): LanguageModel {
  return openrouter.chat(FALLBACK_MODEL);
}
