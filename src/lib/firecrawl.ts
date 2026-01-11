import Firecrawl from "@mendable/firecrawl-js";

function createFirecrawlClient() {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Firecrawl({ apiKey });
}

export const firecrawl = createFirecrawlClient();
