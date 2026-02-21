/**
 * Custom Redis Rate Limit Store for express-rate-limit
 *
 * Implements the Store interface using ioredis client to avoid
 * dual Redis client library conflict (Critical Bug #1 fix).
 *
 * This store uses the same Redis connection as the rest of the application,
 * eliminating the need for node-redis and rate-limit-redis packages.
 */

import type { Store, IncrementResponse } from 'express-rate-limit';
import { getRedisClient } from '../../session/redis-client.js';

export interface IORedisStoreOptions {
  /**
   * Prefix for rate limit keys in Redis
   * @default 'rl:'
   */
  prefix?: string;

  /**
   * Whether to reset the expiry time on every increment
   * @default false
   */
  resetExpiryOnChange?: boolean;
}

/**
 * Custom IORedis store for express-rate-limit
 *
 * Uses the shared ioredis client from redis-client.ts to avoid
 * the dual Redis client library issue.
 */
export class IORedisStore implements Store {
  private redis;
  public readonly prefix: string;
  private resetExpiryOnChange: boolean;

  /**
   * Window duration in seconds (15 minutes)
   * express-rate-limit passes windowMs in milliseconds, we convert to seconds
   */
  private readonly windowMs: number = 15 * 60 * 1000; // 15 minutes

  constructor(options: IORedisStoreOptions = {}) {
    this.redis = getRedisClient();
    this.prefix = options.prefix || 'rl:';
    this.resetExpiryOnChange = options.resetExpiryOnChange || false;
  }

  /**
   * Method that actually stores a record of the request in Redis
   * CRITICAL-005 Fix: Uses atomic Lua script to prevent race condition
   */
  async increment(key: string): Promise<IncrementResponse> {
    const fullKey = this.prefix + key;
    const windowSeconds = Math.ceil(this.windowMs / 1000);
    const resetOnChange = this.resetExpiryOnChange ? '1' : '0';

    // CRITICAL-005 Fix: Use Lua script to make INCR/EXPIRE/TTL atomic
    // This prevents race condition where process crashes between INCR and EXPIRE,
    // which would leave keys without expiry (memory leak + permanent rate limiting)
    const luaScript = `
      local key = KEYS[1]
      local windowSeconds = tonumber(ARGV[1])
      local resetOnChange = ARGV[2]

      local hits = redis.call('INCR', key)

      if hits == 1 then
        redis.call('EXPIRE', key, windowSeconds)
      elseif resetOnChange == '1' then
        redis.call('EXPIRE', key, windowSeconds)
      end

      local ttl = redis.call('TTL', key)
      return {hits, ttl}
    `;

    // Execute Lua script atomically on Redis server
    const result = await this.redis.eval(
      luaScript,
      1, // number of keys
      fullKey, // KEYS[1]
      windowSeconds.toString(), // ARGV[1]
      resetOnChange // ARGV[2]
    ) as [number, number];

    const [hits, ttl] = result;
    const resetTime = ttl > 0 ? new Date(Date.now() + ttl * 1000) : undefined;

    return {
      totalHits: hits,
      resetTime,
    };
  }

  /**
   * Method to decrement the counter for a key
   * (optional, used by some rate limiting strategies)
   */
  async decrement(key: string): Promise<void> {
    const fullKey = this.prefix + key;
    await this.redis.decr(fullKey);
  }

  /**
   * Method to reset the counter for a key
   */
  async resetKey(key: string): Promise<void> {
    const fullKey = this.prefix + key;
    await this.redis.del(fullKey);
  }

  /**
   * Method to reset all keys in the store
   * Uses SCAN cursor to avoid blocking the server with KEYS command
   */
  async resetAll(): Promise<void> {
    const pattern = `${this.prefix}*`;
    const stream = this.redis.scanStream({
      match: pattern,
      count: 100,
    });

    stream.on('data', async (keys: string[]) => {
      if (keys.length > 0) {
        // Use pipeline for batch deletion
        const pipeline = this.redis.pipeline();
        keys.forEach((key) => pipeline.del(key));
        await pipeline.exec();
      }
    });

    return new Promise((resolve, reject) => {
      stream.on('end', () => resolve());
      stream.on('error', (err) => reject(err));
    });
  }

  /**
   * Initialize the store (called by express-rate-limit)
   * No-op for Redis stores since connection is already established
   */
  async init(): Promise<void> {
    // Redis client is already connected via redis-client.ts
    // Log successful initialization
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'IORedisStore initialized',
        prefix: this.prefix,
      })
    );
  }
}
