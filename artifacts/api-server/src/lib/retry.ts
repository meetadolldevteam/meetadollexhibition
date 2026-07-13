import { logger } from "./logger";

interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  label?: string;
}

/**
 * Retry an async operation with exponential backoff + jitter.
 * Useful for transient Supabase or external API failures.
 *
 * Delays: 200ms → 400ms → 800ms (with ±100ms jitter each)
 */
export async function withRetry<T>(
  fn: () => PromiseLike<T> | Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 200, label = "operation" } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts) break;

      const jitter = Math.random() * 100;
      const delay = baseDelayMs * Math.pow(2, attempt - 1) + jitter;

      logger.warn(
        { label, attempt, maxAttempts, delayMs: Math.round(delay), err },
        `Retrying after transient failure`
      );

      await new Promise<void>((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
