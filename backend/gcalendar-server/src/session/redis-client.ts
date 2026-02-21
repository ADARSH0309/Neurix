import { Redis, type RedisOptions } from 'ioredis';
import { redis_connections_active } from '../http/metrics/prometheus.js';
import { redisHealthTracker } from './redis-health.js';

/**
 * Redis Client Singleton
 */

let redisClient: Redis | null = null;

export interface RedisConfig {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  db?: number;
}

export function initializeRedis(config?: RedisConfig): Redis {
  if (redisClient) {
    return redisClient;
  }

  if (config?.url) {
    redisClient = new Redis(config.url, {
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,
      commandTimeout: 5000,
      keepAlive: 30000,
      lazyConnect: true,
      enableOfflineQueue: true,
      offlineQueue: true,
      retryStrategy: (times: number): number | void => {
        if (times > 10) {
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'error',
            message: 'Redis retry limit exceeded',
            attempts: times,
          }));
          return undefined;
        }
        const delay = Math.min(times * 50, 2000);
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'warn',
          message: 'Retrying Redis connection',
          attempt: times,
          delay: `${delay}ms`,
        }));
        return delay;
      },
      reconnectOnError: (err: Error): boolean | 1 | 2 => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return 1;
        }
        return false;
      },
    });
  } else {
    const redisOptions: RedisOptions = {
      host: config?.host || process.env.REDIS_HOST || 'localhost',
      port: config?.port || parseInt(process.env.REDIS_PORT || '6379', 10),
      password: config?.password || process.env.REDIS_PASSWORD,
      db: config?.db || 0,
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,
      commandTimeout: 5000,
      keepAlive: 30000,
      lazyConnect: true,
      enableOfflineQueue: true,
      offlineQueue: true,
      retryStrategy: (times: number): number | void => {
        if (times > 10) {
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'error',
            message: 'Redis retry limit exceeded',
            attempts: times,
          }));
          return undefined;
        }
        const delay = Math.min(times * 50, 2000);
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'warn',
          message: 'Retrying Redis connection',
          attempt: times,
          delay: `${delay}ms`,
        }));
        return delay;
      },
      reconnectOnError: (err: Error): boolean | 1 | 2 => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return 1;
        }
        return false;
      },
      tls: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: true,
      } : undefined,
    };
    redisClient = new Redis(redisOptions);
  }

  redisClient.on('connect', () => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Redis client connected',
    }));
    redis_connections_active.set(1);
    redisHealthTracker.recordConnection();
  });

  redisClient.on('ready', () => {
    redis_connections_active.set(1);
    redisHealthTracker.recordConnection();
  });

  redisClient.on('error', (err: Error) => {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Redis client error',
      error: err.message,
    }));
    redisHealthTracker.recordError(err);
  });

  redisClient.on('close', () => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message: 'Redis client connection closed',
    }));
    redis_connections_active.set(0);
    redisHealthTracker.recordDisconnection();
  });

  redisClient.on('end', () => {
    redis_connections_active.set(0);
    redisHealthTracker.recordDisconnection();
  });

  redisClient.connect().catch((err: Error) => {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Failed to connect to Redis on initialization',
      error: err.message,
      note: 'Connection will be retried on first command due to lazyConnect',
    }));
  });

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Redis client initialized',
    connectionType: config?.url ? 'url' : 'host/port',
    lazyConnect: true,
  }));

  return redisClient;
}

export function getRedisClient(): Redis {
  if (!redisClient) {
    return initializeRedis();
  }
  return redisClient;
}

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

export function isRedisConnected(): boolean {
  return redisClient?.status === 'ready';
}
