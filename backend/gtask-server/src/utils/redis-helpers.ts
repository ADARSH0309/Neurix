/**
 * Redis Helper Utilities
 *
 * Provides non-blocking Redis operations to replace KEYS command.
 */

import type { Redis } from 'ioredis';

/**
 * Non-blocking scan operation to replace KEYS command
 */
export async function scanKeys(
  redis: Redis,
  pattern: string,
  callback: (keys: string[]) => Promise<void>
): Promise<void> {
  let cursor = '0';
  let totalKeys = 0;

  do {
    try {
      const result = await redis.scan(
        cursor,
        'MATCH', pattern,
        'COUNT', '100'
      );

      cursor = result[0];
      const keys = result[1];

      if (keys.length > 0) {
        await callback(keys);
        totalKeys += keys.length;
      }
    } catch (error) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Redis SCAN error',
        pattern,
        cursor,
        error: error instanceof Error ? error.message : 'Unknown',
      }));
      throw error;
    }
  } while (cursor !== '0');

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'debug',
    message: 'Redis SCAN completed',
    pattern,
    totalKeys,
  }));
}

/**
 * Get all keys matching pattern
 */
export async function getAllKeys(
  redis: Redis,
  pattern: string
): Promise<string[]> {
  const keys: string[] = [];
  await scanKeys(redis, pattern, async (batch) => {
    keys.push(...batch);
  });
  return keys;
}
