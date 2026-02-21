/**
 * Metrics Endpoint Authentication Middleware
 */

import { Request, Response, NextFunction } from 'express';

export function metricsAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    return next();
  }

  const metricsToken = process.env.METRICS_AUTH_TOKEN;

  if (!metricsToken) {
    res.status(503).json({
      error: 'Metrics endpoint unavailable',
      message: 'Metrics authentication not configured',
    });
    return;
  }

  const authHeader = req.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Authentication required',
      message: 'Metrics endpoint requires bearer token authentication in production',
    });
    return;
  }

  const providedToken = authHeader.substring(7);

  if (providedToken !== metricsToken) {
    res.status(403).json({
      error: 'Invalid authentication token',
      message: 'Provided token does not match configured METRICS_AUTH_TOKEN',
    });
    return;
  }

  next();
}
