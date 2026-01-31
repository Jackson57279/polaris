/**
 * Retry utility with exponential backoff
 * 
 * Automatically retries failed async operations with exponential backoff delay.
 * Useful for handling transient failures in API calls, network requests, etc.
 */

interface RetryOptions {
  /** Maximum number of attempts (default: 3) */
  maxAttempts?: number;
  /** Base delay in milliseconds (default: 1000) */
  baseDelay?: number;
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelay?: number;
  /** Callback invoked before each retry */
  onRetry?: (error: Error, attempt: number) => void;
}

/**
 * Executes an async function with exponential backoff retry logic
 * 
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns The result of the function if successful
 * @throws The last error if all attempts fail
 * 
 * @example
 * ```typescript
 * const result = await withRetry(
 *   async () => {
 *     const response = await fetch('https://api.example.com/data');
 *     return response.json();
 *   },
 *   {
 *     maxAttempts: 3,
 *     baseDelay: 1000,
 *     onRetry: (error, attempt) => {
 *       console.log(`Retry attempt ${attempt}: ${error.message}`);
 *     }
 *   }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    onRetry,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // If this was the last attempt, throw the error
      if (attempt === maxAttempts) {
        throw lastError;
      }

      // Calculate exponential backoff delay
      const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
      const delay = Math.min(exponentialDelay, maxDelay);

      // Invoke retry callback if provided
      if (onRetry) {
        onRetry(lastError, attempt);
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Unknown error in retry logic');
}
