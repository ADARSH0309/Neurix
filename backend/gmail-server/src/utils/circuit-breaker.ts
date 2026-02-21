/**
 * Circuit Breaker for Gmail API
 *
 * Implements circuit breaker pattern using opossum library to prevent cascading failures
 * when Gmail APIs slow down or become unavailable.
 *
 * Circuit breaker states:
 * - CLOSED: Normal operation, requests flow through
 * - OPEN: API is failing, requests are rejected immediately
 * - HALF_OPEN: Testing if API has recovered
 */

import CircuitBreaker from 'opossum';
import { circuitBreakerState, circuitBreakerEvents } from '../lib/metrics.js';
import { logger } from '../lib/logger.js';

export interface GmailCircuitBreakerOptions {
  /** Timeout in milliseconds before request is considered failed (default: 10000ms) */
  timeout?: number;
  /** Error threshold percentage to open circuit (default: 50) */
  errorThresholdPercentage?: number;
  /** Time in milliseconds circuit stays open before attempting recovery (default: 30000ms) */
  resetTimeout?: number;
  /** Rolling time window in milliseconds for tracking errors (default: 10000ms) */
  rollingCountTimeout?: number;
  /** Number of buckets in rolling window (default: 10) */
  rollingCountBuckets?: number;
  /** Minimum requests before circuit can open (default: 5) */
  volumeThreshold?: number;
  /** Name for logging purposes */
  name?: string;
}

const DEFAULT_OPTIONS: Required<Omit<GmailCircuitBreakerOptions, 'name'>> = {
  timeout: 10000, // 10 seconds
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  rollingCountTimeout: 10000,
  rollingCountBuckets: 10,
  volumeThreshold: 5,
};

export type CircuitBreakerStateCallback = (state: 'open' | 'halfOpen' | 'close') => void;

export function createGmailCircuitBreaker<T extends (...args: any[]) => Promise<any>>(
  gmailApiFunction: T,
  options: GmailCircuitBreakerOptions = {},
  onStateChange?: CircuitBreakerStateCallback
): CircuitBreaker<any[], any> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const name = options.name || 'GmailAPI';

  const breaker = new CircuitBreaker(gmailApiFunction, {
    timeout: config.timeout,
    errorThresholdPercentage: config.errorThresholdPercentage,
    resetTimeout: config.resetTimeout,
    rollingCountTimeout: config.rollingCountTimeout,
    rollingCountBuckets: config.rollingCountBuckets,
    volumeThreshold: config.volumeThreshold,
    name,
  });

  breaker.on('open', () => {
    logger.error(`Circuit breaker opened for ${name}`, {
      circuit: name,
      state: 'open',
    });
    circuitBreakerState.set({ operation: name }, 2); // 2 = open
    circuitBreakerEvents.inc({ operation: name, event: 'open' });
    onStateChange?.('open');
  });

  breaker.on('halfOpen', () => {
    logger.warn(`Circuit breaker half-open for ${name} - testing recovery`, {
      circuit: name,
      state: 'halfOpen',
    });
    circuitBreakerState.set({ operation: name }, 1); // 1 = half-open
    circuitBreakerEvents.inc({ operation: name, event: 'half_open' });
    onStateChange?.('halfOpen');
  });

  breaker.on('close', () => {
    logger.info(`Circuit breaker closed for ${name} - API recovered`, {
      circuit: name,
      state: 'close',
    });
    circuitBreakerState.set({ operation: name }, 0); // 0 = closed
    circuitBreakerEvents.inc({ operation: name, event: 'close' });
    onStateChange?.('close');
  });

  breaker.on('timeout', () => {
    logger.error(`Circuit breaker timeout for ${name}`, {
      circuit: name,
      timeout: config.timeout,
    });
  });

  breaker.on('reject', () => {
    logger.warn(`Circuit breaker rejected request for ${name} - circuit is open`, {
      circuit: name,
    });
    circuitBreakerEvents.inc({ operation: name, event: 'reject' });
  });

  breaker.on('failure', (error) => {
    logger.error(`Circuit breaker request failed for ${name}`, {
      circuit: name,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  });

  return breaker;
}

export function isCircuitBreakerOpenError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('Breaker is open') || error.message.includes('EOPENBREAKER');
  }
  return false;
}

export function isCircuitBreakerTimeoutError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('Timed out') || error.message.includes('ETIMEDOUT');
  }
  return false;
}

export function formatCircuitBreakerError(error: unknown, apiName: string): string {
  if (isCircuitBreakerOpenError(error)) {
    return `Gmail API is currently unavailable (${apiName}). The circuit breaker is open due to repeated failures. Please try again in 30 seconds.`;
  }
  if (isCircuitBreakerTimeoutError(error)) {
    return `Gmail API request timed out (${apiName}). The request took longer than 10 seconds. Please try again.`;
  }
  if (error instanceof Error) {
    return `Gmail API error (${apiName}): ${error.message}`;
  }
  return `Gmail API error (${apiName}): Unknown error`;
}
