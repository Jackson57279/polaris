import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  generateWithFallback,
  getOpenRouterModel,
  getDefaultModel,
} from "./ai-provider-with-fallback";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "X-Title": "Polaris IDE",
  },
});

export const anthropic = (model: string) => openrouter.chat(model);
export const google = (model: string) => openrouter.chat(model);

export { generateWithFallback, getOpenRouterModel, getDefaultModel };
