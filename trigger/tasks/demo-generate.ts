import { task } from "@trigger.dev/sdk/v3";
import { generateWithFallback } from "@/lib/ai-providers";
import { firecrawl } from "@/lib/firecrawl";

const URL_REGEX = /https?:\/\/[^\s]+/g;

export const demoGenerate = task({
  id: "demo-generate",
  run: async ({ prompt }: { prompt: string }) => {
    const urls = prompt.match(URL_REGEX) ?? [];

    let scrapedContent = "";
    if (firecrawl && urls.length > 0) {
      const results = await Promise.all(
        urls.map(async (url) => {
          if (!firecrawl) return null;
          const result = await firecrawl.scrape(url, { formats: ["markdown"] });
          return result.markdown ?? null;
        })
      );

      scrapedContent = results.filter(Boolean).join("\n\n");
    }

    const finalPrompt = scrapedContent
      ? `Context:\n${scrapedContent}\n\nQuestion: ${prompt}`
      : prompt;

    const response = await generateWithFallback(
      [{ role: "user", content: finalPrompt }],
      { temperature: 0.7, max_tokens: 2000 }
    );

    return response;
  },
});
