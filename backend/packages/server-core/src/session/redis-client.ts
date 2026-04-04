import { Redis, type RedisOptions } from 'ioredis';
import { redis_connections_active } from '../http/metrics/prometheus.js';
import { redisHealthTracker } from './redis-health.js';
import { MemoryStore } from './memory-store.js';

/**
 * Redis Client with In-Memory Fallback
 *
 * Tries to connect to Redis. If Redis is unavailable after a timeout,
 * falls back to an in-memory store so the app remains functional.
 */

let redisClient: any = null;
let usingMemoryStore = false;

/**
 * A proxy that always delegates to the CURRENT redisClient.
 * This means even if we switch from Redis to MemoryStore after initialization,
 * all managers that captured getRedisClient() will automatically use the new store.
 */
const redisProxy = new Proxy({} as any, {
  get(_target, prop) {
    const client = redisClient;
    if (!client) throw new Error('Redis client not initialized');
    const val = client[prop];
    return typeof val === 'function' ? val.bind(client) : val;
  },
  set(_target, prop, value) {
    if (redisClient) redisClient[prop] = value;
    return true;
  },
});

export interface RedisConfig {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  db?: number;
}

/**
 * Initialize Redis client with automatic in-memory fallback.
 */
export function initializeRedis(config?: RedisConfig): any {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = config?.url;

  if (!redisUrl) {
    // No Redis URL configured — go straight to memory store
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message: 'No REDIS_URL configured, using in-memory store',
    }));
    redisClient = new MemoryStore() as any;
    usingMemoryStore = true;
    redisHealthTracker.recordConnection();
    return redisClient;
  }

  // Try Redis with a connection timeout
  const isTls = redisUrl.startsWith('rediss://');
  const realRedis = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    connectTimeout: 8000,
    commandTimeout: 5000,
    keepAlive: 30000,
    lazyConnect: true,
    enableOfflineQueue: false, // Don't queue — we'll fallback instead
    family: 0,
    tls: isTls ? { rejectUnauthorized: false } : undefined,
    retryStrategy: (times: number): number | void => {
      // Only retry a few times before we fall back to memory
      if (times > 5) return undefined;
      return Math.min(times * 500, 3000);
    },
    reconnectOnError: (): 1 => 1,
  });

  // Set up connection race: Redis vs timeout
  const connectionTimeout = 10000; // 10 seconds to connect

  const fallbackToMemory = () => {
    if (usingMemoryStore) return; // Already fell back
    usingMemoryStore = true;

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message: 'Redis connection failed — falling back to in-memory store',
      url: redisUrl.replace(/\/\/[^@]*@/, '//***@'),
    }));

    // Disconnect real Redis to stop retry spam
    realRedis.disconnect();

    redisClient = new MemoryStore() as any;
    redisHealthTracker.recordConnection();
  };

  const timeout = setTimeout(fallbackToMemory, connectionTimeout);

  realRedis.on('ready', () => {
    clearTimeout(timeout);
    if (usingMemoryStore) return; // Too late, already using memory

    redisClient = realRedis;
    redis_connections_active.set(1);
    redisHealthTracker.recordConnection();

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Redis client connected successfully',
      url: redisUrl.replace(/\/\/[^@]*@/, '//***@'),
    }));
  });

  realRedis.on('error', (err: Error) => {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Redis client error',
      error: err.message,
    }));
    redisHealthTracker.recordError(err);
  });

  realRedis.on('end', () => {
    redis_connections_active.set(0);
    redisHealthTracker.recordDisconnection();
    fallbackToMemory();
  });

  // Start connection attempt
  redisClient = realRedis; // Temporarily set to real Redis
  realRedis.connect().catch(() => {
    // Connection failed, timeout will handle fallback
  });

  return redisClient;
}

/**
 * Get the Redis/memory client proxy.
 * Always delegates to the current active client (Redis or MemoryStore).
 */
export function getRedisClient(): any {
  if (!redisClient) {
    initializeRedis();
  }
  return redisProxy;
}

/**
 * Close connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Redis/memory client closed',
    }));
  }
}

/**
 * Check if client is connected and ready
 */
export function isRedisConnected(): boolean {
  if (usingMemoryStore) return true;
  return redisClient?.status === 'ready';
}

/**
 * Check if using in-memory fallback
 */
export function isUsingMemoryStore(): boolean {
  return usingMemoryStore;
}
