/**
 * Circuit Breaker for Google Calendar API
 *
 * Implements circuit breaker pattern using opossum library to prevent cascading failures
 * when Calendar APIs slow down or become unavailable.
 *
 * Circuit breaker states:
 * - CLOSED: Normal operation, requests flow through
 * - OPEN: API is failing, requests are rejected immediately
 * - HALF_OPEN: Testing if API has recovered
 */

import CircuitBreaker from 'opossum';

export interface CalendarCircuitBreakerOptions {
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

const DEFAULT_OPTIONS: Required<Omit<CalendarCircuitBreakerOptions, 'name'>> = {
  timeout: 10000, // 10 seconds (Calendar operations can be slower)
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  rollingCountTimeout: 10000,
  rollingCountBuckets: 10,
  volumeThreshold: 5,
};

export type CircuitBreakerStateCallback = (state: 'open' | 'halfOpen' | 'close') => void;

export function createCalendarCircuitBreaker<T extends (...args: any[]) => Promise<any>>(
  calendarApiFunction: T,
  options: CalendarCircuitBreakerOptions = {},
  onStateChange?: CircuitBreakerStateCallback
): CircuitBreaker<any[], any> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const name = options.name || 'CalendarAPI';

  const breaker = new CircuitBreaker(calendarApiFunction, {
    timeout: config.timeout,
    errorThresholdPercentage: config.errorThresholdPercentage,
    resetTimeout: config.resetTimeout,
    rollingCountTimeout: config.rollingCountTimeout,
    rollingCountBuckets: config.rollingCountBuckets,
    volumeThreshold: config.volumeThreshold,
    name,
  });

  breaker.on('open', () => {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `Circuit breaker opened for ${name}`,
        circuit: name,
        state: 'open',
      })
    );
    onStateChange?.('open');
  });

  breaker.on('halfOpen', () => {
    console.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: `Circuit breaker half-open for ${name} - testing recovery`,
        circuit: name,
        state: 'halfOpen',
      })
    );
    onStateChange?.('halfOpen');
  });

  breaker.on('close', () => {
    console.info(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Circuit breaker closed for ${name} - API recovered`,
        circuit: name,
        state: 'close',
      })
    );
    onStateChange?.('close');
  });

  breaker.on('timeout', () => {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `Circuit breaker timeout for ${name}`,
        circuit: name,
        timeout: config.timeout,
      })
    );
  });

  breaker.on('reject', () => {
    console.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: `Circuit breaker rejected request for ${name} - circuit is open`,
        circuit: name,
      })
    );
  });

  breaker.on('failure', (error) => {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `Circuit breaker request failed for ${name}`,
        circuit: name,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    );
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
    return `Google Calendar API is currently unavailable (${apiName}). The circuit breaker is open due to repeated failures. Please try again in 30 seconds.`;
  }
  if (isCircuitBreakerTimeoutError(error)) {
    return `Google Calendar API request timed out (${apiName}). The request took longer than 10 seconds. Please try again.`;
  }
  if (error instanceof Error) {
    return `Google Calendar API error (${apiName}): ${error.message}`;
  }
  return `Google Calendar API error (${apiName}): Unknown error`;
}
