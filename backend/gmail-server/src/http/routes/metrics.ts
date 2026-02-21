/**
 * Prometheus Metrics Route
 */

import type { Request, Response } from 'express';
import { register } from '../metrics/prometheus.js';

export async function handleMetrics(req: Request, res: Response): Promise<void> {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Failed to collect metrics',
      error: error instanceof Error ? error.message : 'Unknown error',
    }));

    res.status(500).json({
      error: 'Failed to collect metrics',
    });
  }
}
