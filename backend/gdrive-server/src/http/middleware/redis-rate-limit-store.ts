/**
 * Custom Redis Rate Limit Store for express-rate-limit
 *
 * Implements the Store interface using ioredis client.
 */

import type { Store, IncrementResponse } from 'express-rate-limit';
import { getRedisClient } from '../../session/redis-client.js';

export interface IORedisStoreOptions {
  prefix?: string;
  resetExpiryOnChange?: boolean;
}

/**
 * Custom IORedis store for express-rate-limit
 */
export class IORedisStore implements Store {
  private redis;
  public readonly prefix: string;
  private resetExpiryOnChange: boolean;
  private readonly windowMs: number = 15 * 60 * 1000;

  constructor(options: IORedisStoreOptions = {}) {
    this.redis = getRedisClient();
    this.prefix = options.prefix || 'rl:';
    this.resetExpiryOnChange = options.resetExpiryOnChange || false;
  }

  /**
   * Increment counter using atomic Lua script
   */
  async increment(key: string): Promise<IncrementResponse> {
    const fullKey = this.prefix + key;
    const windowSeconds = Math.ceil(this.windowMs / 1000);
    const resetOnChange = this.resetExpiryOnChange ? '1' : '0';

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

    const result = await this.redis.eval(
      luaScript,
      1,
      fullKey,
      windowSeconds.toString(),
      resetOnChange
    ) as [number, number];

    const [hits, ttl] = result;
    const resetTime = ttl > 0 ? new Date(Date.now() + ttl * 1000) : undefined;

    return {
      totalHits: hits,
      resetTime,
    };
  }

  async decrement(key: string): Promise<void> {
    const fullKey = this.prefix + key;
    await this.redis.decr(fullKey);
  }

  async resetKey(key: string): Promise<void> {
    const fullKey = this.prefix + key;
    await this.redis.del(fullKey);
  }

  async resetAll(): Promise<void> {
    const pattern = `${this.prefix}*`;
    const stream = this.redis.scanStream({
      match: pattern,
      count: 100,
    });

    stream.on('data', async (keys: string[]) => {
      if (keys.length > 0) {
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

  async init(): Promise<void> {
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
