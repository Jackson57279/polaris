import { createAnthropic } from "@ai-sdk/anthropic";
import {
  generateWithFallback,
  getOpenRouterModel,
  getDefaultModel,
} from "./ai-provider-with-fallback";

const openrouter = createAnthropic({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  headers: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "X-Title": "Polaris IDE",
  },
});

export const anthropic = (model: string) => openrouter(model);
export const google = (model: string) => openrouter(model);

export { generateWithFallback, getOpenRouterModel, getDefaultModel };
