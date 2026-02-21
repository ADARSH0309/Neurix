/**
 * Prometheus Metrics Endpoint
 *
 * Phase 5.1 - Week 2, Task 2.4: Prometheus Metrics (Issue #9)
 *
 * Provides /metrics endpoint for Prometheus scraping.
 * Returns all registered metrics in Prometheus text exposition format.
 *
 * Authentication: None required (public endpoint for Prometheus scraper)
 * CORS: Uses healthCheckCorsMiddleware (permissive for monitoring tools)
 */

import { Request, Response } from 'express';
import { register } from '../metrics/prometheus.js';

/**
 * Handle GET /metrics
 *
 * Returns Prometheus metrics in text/plain format.
 * This endpoint is scraped periodically by Prometheus server.
 *
 * Phase 5.1 - Week 2, Task 2.4: Prometheus Metrics (Issue #9)
 */
export async function handleMetrics(req: Request, res: Response): Promise<void> {
  try {
    // Set content type to text/plain for Prometheus
    res.setHeader('Content-Type', register.contentType);

    // Get all metrics in Prometheus format
    const metrics = await register.metrics();

    res.send(metrics);
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Failed to generate metrics',
      error: error instanceof Error ? error.message : 'Unknown error',
    }));

    res.status(500).send('Error generating metrics');
  }
}
