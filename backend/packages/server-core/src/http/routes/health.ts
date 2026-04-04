/**
 * Health Check Route
 */

import type { Request, Response } from 'express';
import { isRedisConnected, getRedisClient } from '../../session/redis-client.js';
import { redisHealthTracker } from '../../session/redis-health.js';

export async function handleHealthCheck(req: Request, res: Response): Promise<void> {
  const redisConnected = isRedisConnected();
  const redisHealth = redisHealthTracker.getStatus();
  const uptime = process.uptime();

  // Get Redis client status for diagnostics
  const redis = getRedisClient();
  const redisStatus = redis?.status || 'unknown';

  // Mask the Redis URL for diagnostics
  const rawUrl = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL || '';
  const maskedUrl = rawUrl ? rawUrl.replace(/\/\/[^@]*@/, '//***@') : 'not set';

  const health = {
    status: redisConnected ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(uptime),
    version: '1.0.0',
    checks: {
      redis: {
        status: redisHealth.status,
        connected: redisHealth.connected,
        clientStatus: redisStatus,
        url: maskedUrl,
        lastError: redisHealth.lastError,
        features: redisHealth.features,
      },
    },
  };

  const statusCode = health.status === 'healthy' ? 200 : 503;

  res.status(statusCode).json(health);
}
