import { Redis, type RedisOptions } from 'ioredis';
// Phase 5.1 - Week 2, Task 2.4: Prometheus Metrics (Issue #9)
import { redis_connections_active } from '../http/metrics/prometheus.js';
// Phase 5.1 - Week 3, Task 3.5: Redis Health Tracking (Issue #15)
import { redisHealthTracker } from './redis-health.js';

/**
 * Redis Client Singleton
 *
 * Manages a single Redis connection for the application.
 * Connection is established lazily on first use.
 */

let redisClient: Redis | null = null;

export interface RedisConfig {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  db?: number;
}

/**
 * Initialize Redis client
 */
export function initializeRedis(config?: RedisConfig): Redis {
  if (redisClient) {
    return redisClient;
  }

  // Use connection URL if provided (AWS ElastiCache format)
  // Phase 5.1 - Week 3, Task 3.2: Redis Connection Pooling (Issue #12)
  if (config?.url) {
    // For rediss:// URLs (TLS), disable cert validation for Railway/self-signed certs
    const isTls = config.url.startsWith('rediss://');
    redisClient = new Redis(config.url, {
      maxRetriesPerRequest: null, // Let commands wait indefinitely for reconnect
      connectTimeout: 10000,
      commandTimeout: 5000,
      keepAlive: 30000,
      lazyConnect: false, // Connect immediately so connection is ready for first request
      enableOfflineQueue: true,
      offlineQueue: true,
      family: 4, // Force IPv4 — Railway proxy may not support IPv6
      tls: isTls ? { rejectUnauthorized: false } : undefined,
      retryStrategy: (times: number): number => {
        // Never give up — Railway internal DNS can take time to propagate
        const delay = Math.min(times * 200, 5000);
        if (times % 10 === 0) {
          console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'warn',
            message: 'Retrying Redis connection',
            attempt: times,
            delay: `${delay}ms`,
          }));
        }
        return delay;
      },
      reconnectOnError: (): 1 => 1, // Always reconnect and resend failed command
    });
  } else {
    // Use individual connection parameters
    // Phase 5.1 - Week 3, Task 3.2: Redis Connection Pooling (Issue #12)
    const redisOptions: RedisOptions = {
      host: config?.host || process.env.REDIS_HOST || 'localhost',
      port: config?.port || parseInt(process.env.REDIS_PORT || '6379', 10),
      password: config?.password || process.env.REDIS_PASSWORD,
      db: config?.db || 0,

      // Connection Pooling Configuration
      // Limit retries per request to prevent indefinite blocking
      maxRetriesPerRequest: 3,

      // Connection timeout: 10 seconds to establish connection
      connectTimeout: 10000,

      // Command timeout: 5 seconds for Redis commands to complete
      // Prevents hanging on slow operations
      commandTimeout: 5000,

      // TCP KeepAlive: Send keepalive probes every 30 seconds
      // Prevents idle connections from being dropped by firewalls/load balancers
      keepAlive: 30000,

      // Lazy connect: Wait until first command before connecting
      // Allows app to start even if Redis is temporarily unavailable
      lazyConnect: true,

      // Enable offline queue: Queue commands when disconnected (up to 1000 commands)
      // Provides graceful degradation during brief network issues
      enableOfflineQueue: true,
      offlineQueue: true,

      // Never give up retrying — Railway DNS can take time
      retryStrategy: (times: number): number => {
        const delay = Math.min(times * 200, 5000);
        if (times % 10 === 0) {
          console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'warn',
            message: 'Retrying Redis connection',
            attempt: times,
            delay: `${delay}ms`,
          }));
        }
        return delay;
      },
      reconnectOnError: (): 1 => 1, // Always reconnect and resend failed command

      // TLS: Only enable when REDIS_TLS=true is explicitly set (e.g. AWS ElastiCache)
      // Railway Redis does not need TLS for internal connections
      tls: process.env.REDIS_TLS === 'true' ? { rejectUnauthorized: true } : undefined,
    };
    redisClient = new Redis(redisOptions);
  }

  // Log connection events
  redisClient.on('connect', () => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Redis client connected',
    }));

    // Phase 5.1 - Week 2, Task 2.4: Prometheus Metrics (Issue #9)
    redis_connections_active.set(1);

    // Phase 5.1 - Week 3, Task 3.5: Redis Health Tracking (Issue #15)
    redisHealthTracker.recordConnection();
  });

  redisClient.on('ready', () => {
    // Phase 5.1 - Week 2, Task 2.4: Prometheus Metrics (Issue #9)
    redis_connections_active.set(1);

    // Phase 5.1 - Week 3, Task 3.5: Redis Health Tracking (Issue #15)
    redisHealthTracker.recordConnection();
  });

  redisClient.on('error', (err: Error) => {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Redis client error',
      error: err.message,
    }));

    // Phase 5.1 - Week 3, Task 3.5: Redis Health Tracking (Issue #15)
    redisHealthTracker.recordError(err);
  });

  redisClient.on('close', () => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message: 'Redis client connection closed',
    }));

    // Phase 5.1 - Week 2, Task 2.4: Prometheus Metrics (Issue #9)
    redis_connections_active.set(0);

    // Phase 5.1 - Week 3, Task 3.5: Redis Health Tracking (Issue #15)
    redisHealthTracker.recordDisconnection();
  });

  redisClient.on('end', () => {
    // Phase 5.1 - Week 2, Task 2.4: Prometheus Metrics (Issue #9)
    redis_connections_active.set(0);

    // Phase 5.1 - Week 3, Task 3.5: Redis Health Tracking (Issue #15)
    redisHealthTracker.recordDisconnection();
  });

  // For host/port path (lazyConnect: true), manually initiate connection
  // For URL path (lazyConnect: false), ioredis connects automatically
  if (config?.url === undefined) {
    redisClient.connect().catch((err: Error) => {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Failed to connect to Redis on initialization',
        error: err.message,
        note: 'Connection will be retried on first command due to lazyConnect',
      }));
    });
  }

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Redis client initialized',
    connectionType: config?.url ? 'url' : 'host/port',
    lazyConnect: true,
    pooling: {
      connectTimeout: '10s',
      commandTimeout: '5s',
      keepAlive: '30s',
      maxRetriesPerRequest: 3,
      offlineQueue: true,
    },
  }));

  return redisClient;
}

/**
 * Get the Redis client instance
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    return initializeRedis();
  }
  return redisClient;
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Redis client closed',
    }));
  }
}

/**
 * Check if Redis is connected
 */
export function isRedisConnected(): boolean {
  return redisClient?.status === 'ready';
}
