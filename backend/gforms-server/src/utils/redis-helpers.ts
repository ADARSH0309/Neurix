/**
 * Redis Helper Utilities
 *
 * Provides non-blocking Redis operations to replace KEYS command.
 * KEYS command blocks Redis and causes performance issues with large datasets.
 * SCAN command is non-blocking and processes keys in batches.
 */

import type { Redis } from 'ioredis';

/**
 * Non-blocking scan operation to replace KEYS command
 *
 * Uses Redis SCAN to iterate through keys without blocking the server.
 * Processes keys in batches of 100 for optimal performance.
 *
 * @param redis - Redis client instance
 * @param pattern - Pattern to match (e.g., "session:*")
 * @param callback - Function called with each batch of keys
 *
 * @example
 * ```typescript
 * await scanKeys(redis, 'session:*', async (keys) => {
 *   for (const key of keys) {
 *     const data = await redis.get(key);
 *     console.log(data);
 *   }
 * });
 * ```
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
        'COUNT', '100'  // Process 100 keys per iteration
      );

      cursor = result[0];  // Next cursor position
      const keys = result[1];  // Matched keys

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
  } while (cursor !== '0');  // cursor=0 means scan complete

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'debug',
    message: 'Redis SCAN completed',
    pattern,
    totalKeys,
  }));
}

/**
 * Get all keys matching pattern (convenience wrapper)
 *
 * This function collects all matching keys into an array.
 * For large datasets, prefer using scanKeys() with streaming callback.
 *
 * @param redis - Redis client instance
 * @param pattern - Pattern to match (e.g., "session:*")
 * @returns Array of matching keys
 *
 * @example
 * ```typescript
 * const sessionKeys = await getAllKeys(redis, 'session:*');
 * console.log(`Found ${sessionKeys.length} sessions`);
 * ```
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
