/**
 * Retry Logic with Exponential Backoff
 *
 * Provides resilient API call handling with configurable retry behavior
 */

import { isRetryableError, RateLimitError } from './errors.js';

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelay?: number;
  /** Maximum delay in milliseconds (default: 10000) */
  maxDelay?: number;
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  /** Custom function to determine if error is retryable */
  isRetryable?: (error: unknown) => boolean;
  /** Callback for logging retry attempts */
  onRetry?: (attempt: number, error: unknown, delay: number) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'isRetryable' | 'onRetry'>> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

/**
 * Execute an operation with retry logic and exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = DEFAULT_OPTIONS.maxRetries,
    initialDelay = DEFAULT_OPTIONS.initialDelay,
    maxDelay = DEFAULT_OPTIONS.maxDelay,
    backoffMultiplier = DEFAULT_OPTIONS.backoffMultiplier,
    isRetryable = isRetryableError,
    onRetry,
  } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Check if we should retry
      const shouldRetry = isRetryable(error);
      const hasAttemptsLeft = attempt < maxRetries;

      if (!shouldRetry || !hasAttemptsLeft) {
        throw error;
      }

      // Handle rate limit with specific retry-after
      if (error instanceof RateLimitError && error.retryAfter) {
        delay = error.retryAfter * 1000;
      }

      // Notify about retry
      onRetry?.(attempt + 1, error, delay);

      // Wait before retrying
      await sleep(delay);

      // Calculate next delay with exponential backoff
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError!;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a retry wrapper with pre-configured options
 */
export function createRetryWrapper(defaultOptions: RetryOptions) {
  return <T>(operation: () => Promise<T>, options?: RetryOptions): Promise<T> => {
    return withRetry(operation, { ...defaultOptions, ...options });
  };
}

/**
 * Decorator for adding retry logic to class methods
 */
export function Retryable(options: RetryOptions = {}) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      return withRetry(() => originalMethod.apply(this, args), options);
    };

    return descriptor;
  };
}
