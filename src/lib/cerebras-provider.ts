import Cerebras from '@cerebras/cerebras_cloud_sdk';
import { logProviderEvent } from './ai-provider-utils';

const cerebrasClient = new Cerebras({
  apiKey: process.env.CEREBRAS_API_KEY,
});

export const CEREBRAS_MODEL = 'zai-glm-4.7';

export interface CerebrasStreamChunk {
  choices: Array<{
    delta?: {
      content?: string;
      role?: string;
    };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export interface CerebrasCompletion {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function createCerebrasCompletion(
  messages: Array<{ role: string; content: string }>,
  options?: {
    temperature?: number;
    max_tokens?: number;
  }
): Promise<CerebrasCompletion> {
  try {
    logProviderEvent('Creating Cerebras completion', { model: CEREBRAS_MODEL });
    
    const response = await cerebrasClient.chat.completions.create({
      model: CEREBRAS_MODEL,
      messages: messages as any,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? 2000,
    });

    logProviderEvent('Cerebras completion successful');
    return response as CerebrasCompletion;
  } catch (error) {
    if (error instanceof Cerebras.RateLimitError) {
      logProviderEvent('Cerebras rate limit hit', { error });
      throw error;
    }
    
    logProviderEvent('Cerebras error', { error });
    throw error;
  }
}

export async function createCerebrasStreamingCompletion(
  messages: Array<{ role: string; content: string }>,
  options?: {
    temperature?: number;
    max_tokens?: number;
  }
): Promise<AsyncIterable<CerebrasStreamChunk>> {
  try {
    logProviderEvent('Creating Cerebras streaming completion', { model: CEREBRAS_MODEL });
    
    const stream = await cerebrasClient.chat.completions.create({
      model: CEREBRAS_MODEL,
      messages: messages as any,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? 2000,
      stream: true,
    });

    logProviderEvent('Cerebras streaming started');
    return stream as AsyncIterable<CerebrasStreamChunk>;
  } catch (error) {
    if (error instanceof Cerebras.RateLimitError) {
      logProviderEvent('Cerebras rate limit hit (streaming)', { error });
      throw error;
    }
    
    logProviderEvent('Cerebras streaming error', { error });
    throw error;
  }
}

export { Cerebras };
