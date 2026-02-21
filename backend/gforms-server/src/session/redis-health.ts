/**
 * Redis Health Tracking
 *
 * Phase 5.1 - Week 3, Task 3.5: Graceful Degradation for Redis Failures (Issue #15)
 *
 * Tracks Redis health status and provides graceful degradation information.
 * Works in conjunction with existing resilience features:
 * - Retry strategy with exponential backoff
 * - Offline queue (up to 1000 commands)
 * - Lazy connect
 * - Connection pooling with timeouts
 */

export interface RedisHealthStatus {
  status: 'healthy' | 'degraded' | 'unavailable';
  connected: boolean;
  lastError?: {
    message: string;
    timestamp: string;
  };
  features: {
    offlineQueue: boolean;
    retryEnabled: boolean;
    lazyConnect: boolean;
  };
}

class RedisHealthTracker {
  private lastErrorTime: number | null = null;
  private lastErrorMessage: string | null = null;
  private isConnected: boolean = false;

  /**
   * Record a Redis error
   */
  recordError(error: Error): void {
    this.lastErrorTime = Date.now();
    this.lastErrorMessage = error.message;

    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Redis health: Error recorded',
      error: error.message,
      gracefulDegradation: 'Offline queue active, commands will be queued',
    }));
  }

  /**
   * Record successful Redis connection
   */
  recordConnection(): void {
    this.isConnected = true;

    // Clear error if we've been disconnected for a while
    if (this.lastErrorTime && Date.now() - this.lastErrorTime > 60000) {
      this.lastErrorTime = null;
      this.lastErrorMessage = null;
    }

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Redis health: Connected',
      status: 'healthy',
    }));
  }

  /**
   * Record Redis disconnection
   */
  recordDisconnection(): void {
    this.isConnected = false;

    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message: 'Redis health: Disconnected',
      gracefulDegradation: 'Offline queue active, retry strategy enabled',
    }));
  }

  /**
   * Get current Redis health status
   */
  getStatus(): RedisHealthStatus {
    let status: 'healthy' | 'degraded' | 'unavailable';

    if (this.isConnected) {
      status = 'healthy';
    } else if (this.lastErrorTime && Date.now() - this.lastErrorTime < 30000) {
      // Recently had an error (within last 30 seconds)
      status = 'unavailable';
    } else {
      // Disconnected but not recently errored, likely in retry/offline queue mode
      status = 'degraded';
    }

    const result: RedisHealthStatus = {
      status,
      connected: this.isConnected,
      features: {
        offlineQueue: true,
        retryEnabled: true,
        lazyConnect: true,
      },
    };

    if (this.lastErrorTime && this.lastErrorMessage) {
      result.lastError = {
        message: this.lastErrorMessage,
        timestamp: new Date(this.lastErrorTime).toISOString(),
      };
    }

    return result;
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.isConnected || this.getStatus().status === 'degraded';
  }
}

// Singleton instance
export const redisHealthTracker = new RedisHealthTracker();
