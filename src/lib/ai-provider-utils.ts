/**
 * AI Provider Utilities
 * Shared utilities for AI provider management
 */

export type AIProvider = 'cerebras' | 'openrouter';

export interface ProviderMetadata {
  provider: AIProvider;
  model: string;
  usedFallback: boolean;
}

/**
 * Logger for provider events (silent in production unless debug mode)
 */
export const logProviderEvent = (event: string, data?: unknown) => {
  if (process.env.NODE_ENV === 'development' || typeof window !== 'undefined' && window.localStorage?.getItem('DEBUG_AI_PROVIDER')) {
    console.log(`[AI Provider] ${event}`, data);
  }
};

/**
 * Check if code is running in browser
 */
export const isBrowser = () => typeof window !== 'undefined';
