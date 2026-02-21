/**
 * Health Check Route
 */

import type { Request, Response } from 'express';
import { isRedisConnected } from '../../session/redis-client.js';
import { redisHealthTracker } from '../../session/redis-health.js';

export async function handleHealthCheck(req: Request, res: Response): Promise<void> {
  const redisConnected = isRedisConnected();
  const redisHealth = redisHealthTracker.getStatus();
  const uptime = process.uptime();

  const health = {
    status: redisConnected ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(uptime),
    version: '1.0.0',
    checks: {
      redis: {
        status: redisHealth.status,
        connected: redisHealth.connected,
        lastError: redisHealth.lastError,
        features: redisHealth.features,
      },
    },
  };

  const statusCode = health.status === 'healthy' ? 200 : 503;

  res.status(statusCode).json(health);
}
