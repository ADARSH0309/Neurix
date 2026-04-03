/**
 * Circuit Breaker for Google Forms API
 *
 * Phase 5.1 - Week 2, Task 2.5: Circuit Breaker for Google Forms API (Issue #10)
 *
 * Implements circuit breaker pattern using opossum library to prevent cascading failures
 * when Google Forms APIs slow down or become unavailable. This protects the application from
 * queueing requests indefinitely when Google APIs are experiencing issues.
 *
 * Circuit breaker states:
 * - CLOSED: Normal operation, requests flow through
 * - OPEN: API is failing, requests are rejected immediately
 * - HALF_OPEN: Testing if API has recovered
 *
 * Configuration:
 * - timeout: 5000ms (requests taking longer are considered failed)
 * - errorThresholdPercentage: 50% (circuit opens if 50% of requests fail)
 * - resetTimeout: 30000ms (circuit stays open for 30 seconds before testing recovery)
 * - rollingCountTimeout: 10000ms (10 second window for tracking errors)
 * - volumeThreshold: 5 (minimum requests before circuit can open)
 */

import CircuitBreaker from 'opossum';

/**
 * Circuit breaker options for Google Forms API calls
 *
 * Phase 5.1 - Week 2, Task 2.5: Circuit Breaker for Google Forms API (Issue #10)
 */
export interface GFormsCircuitBreakerOptions {
  /** Timeout in milliseconds before request is considered failed (default: 5000ms) */
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

/**
 * Default circuit breaker configuration for Google Forms API
 *
 * Phase 5.1 - Week 2, Task 2.5: Circuit Breaker for Google Forms API (Issue #10)
 */
const DEFAULT_OPTIONS: Required<Omit<GFormsCircuitBreakerOptions, 'name'>> = {
  timeout: 30000, // 30 seconds (Google Forms API can be slow)
  errorThresholdPercentage: 50, // Open circuit if 50% of requests fail
  resetTimeout: 30000, // 30 seconds - how long circuit stays open
  rollingCountTimeout: 10000, // 10 seconds - window for tracking errors
  rollingCountBuckets: 10, // Number of buckets in the rolling window
  volumeThreshold: 5, // Minimum requests before circuit can open
};

/**
 * State change callback type for circuit breaker
 *
 * Phase 5.1 - Week 2, Task 2.5: Circuit Breaker for Google Forms API (Issue #10)
 */
export type CircuitBreakerStateCallback = (state: 'open' | 'halfOpen' | 'close') => void;

/**
 * Creates a circuit breaker for Google Forms API calls
 *
 * This factory function wraps any Google Forms API call with circuit breaker protection.
 * When the circuit is open, requests fail fast instead of queueing indefinitely.
 *
 * @param gformsApiFunction - The Google Forms API function to wrap
 * @param options - Circuit breaker configuration options
 * @param onStateChange - Optional callback for state changes (for metrics)
 * @returns Circuit breaker wrapping the Google Forms API function
 *
 * Phase 5.1 - Week 2, Task 2.5: Circuit Breaker for Google Forms API (Issue #10)
 *
 * @example
 * ```typescript
 * const protectedGetForm = createGFormsCircuitBreaker(
 *   async (params) => this.forms.forms.get(params),
 *   { name: 'getForm' }
 * );
 * const result = await protectedGetForm(params);
 * ```
 */
export function createGFormsCircuitBreaker<T extends (...args: any[]) => Promise<any>>(
  gformsApiFunction: T,
  options: GFormsCircuitBreakerOptions = {},
  onStateChange?: CircuitBreakerStateCallback
): CircuitBreaker<any[], any> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const name = options.name || 'GFormsAPI';

  // Create circuit breaker with configuration
  const breaker = new CircuitBreaker(gformsApiFunction, {
    timeout: config.timeout,
    errorThresholdPercentage: config.errorThresholdPercentage,
    resetTimeout: config.resetTimeout,
    rollingCountTimeout: config.rollingCountTimeout,
    rollingCountBuckets: config.rollingCountBuckets,
    volumeThreshold: config.volumeThreshold,
    name,
  });

  // Event: Circuit opened (API is failing)
  breaker.on('open', () => {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `Circuit breaker opened for ${name}`,
        circuit: name,
        state: 'open',
        context: 'Phase 5.1 - Week 2, Task 2.5: Circuit Breaker for Google Forms API (Issue #10)',
      })
    );
    onStateChange?.('open');
  });

  // Event: Circuit half-open (testing recovery)
  breaker.on('halfOpen', () => {
    console.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: `Circuit breaker half-open for ${name} - testing recovery`,
        circuit: name,
        state: 'halfOpen',
        context: 'Phase 5.1 - Week 2, Task 2.5: Circuit Breaker for Google Forms API (Issue #10)',
      })
    );
    onStateChange?.('halfOpen');
  });

  // Event: Circuit closed (API recovered)
  breaker.on('close', () => {
    console.info(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Circuit breaker closed for ${name} - API recovered`,
        circuit: name,
        state: 'close',
        context: 'Phase 5.1 - Week 2, Task 2.5: Circuit Breaker for Google Forms API (Issue #10)',
      })
    );
    onStateChange?.('close');
  });

  // Event: Fallback triggered (circuit is open, request rejected)
  breaker.on('fallback', (result) => {
    console.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: `Circuit breaker fallback triggered for ${name}`,
        circuit: name,
        fallbackResult: result,
        context: 'Phase 5.1 - Week 2, Task 2.5: Circuit Breaker for Google Forms API (Issue #10)',
      })
    );
  });

  // Event: Request timeout
  breaker.on('timeout', () => {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `Circuit breaker timeout for ${name}`,
        circuit: name,
        timeout: config.timeout,
        context: 'Phase 5.1 - Week 2, Task 2.5: Circuit Breaker for Google Forms API (Issue #10)',
      })
    );
  });

  // Event: Request rejected (circuit is open)
  breaker.on('reject', () => {
    console.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: `Circuit breaker rejected request for ${name} - circuit is open`,
        circuit: name,
        context: 'Phase 5.1 - Week 2, Task 2.5: Circuit Breaker for Google Forms API (Issue #10)',
      })
    );
  });

  // Event: Request failed
  breaker.on('failure', (error) => {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `Circuit breaker request failed for ${name}`,
        circuit: name,
        error: error instanceof Error ? error.message : 'Unknown error',
        context: 'Phase 5.1 - Week 2, Task 2.5: Circuit Breaker for Google Forms API (Issue #10)',
      })
    );
  });

  return breaker;
}

/**
 * Checks if an error is a circuit breaker open error
 *
 * Use this to provide user-friendly error messages when the circuit is open.
 *
 * Phase 5.1 - Week 2, Task 2.5: Circuit Breaker for Google Forms API (Issue #10)
 *
 * @param error - The error to check
 * @returns true if error is circuit breaker open error
 */
export function isCircuitBreakerOpenError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('Breaker is open') || error.message.includes('EOPENBREAKER');
  }
  return false;
}

/**
 * Checks if an error is a circuit breaker timeout error
 *
 * Phase 5.1 - Week 2, Task 2.5: Circuit Breaker for Google Forms API (Issue #10)
 *
 * @param error - The error to check
 * @returns true if error is timeout error
 */
export function isCircuitBreakerTimeoutError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('Timed out') || error.message.includes('ETIMEDOUT');
  }
  return false;
}

/**
 * Creates a user-friendly error message for circuit breaker errors
 *
 * Phase 5.1 - Week 2, Task 2.5: Circuit Breaker for Google Forms API (Issue #10)
 *
 * @param error - The error to format
 * @param apiName - Name of the API operation
 * @returns User-friendly error message
 */
export function formatCircuitBreakerError(error: unknown, apiName: string): string {
  if (isCircuitBreakerOpenError(error)) {
    return `Google Forms API is currently unavailable (${apiName}). The circuit breaker is open due to repeated failures. Please try again in 30 seconds.`;
  }
  if (isCircuitBreakerTimeoutError(error)) {
    return `Google Forms API request timed out (${apiName}). The request took longer than 30 seconds. Please try again.`;
  }
  if (error instanceof Error) {
    return `Google Forms API error (${apiName}): ${error.message}`;
  }
  return `Google Forms API error (${apiName}): Unknown error`;
}
