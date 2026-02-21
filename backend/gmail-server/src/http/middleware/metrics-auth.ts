/**
 * Metrics Endpoint Authentication Middleware
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Environment-aware metrics authentication middleware
 */
export function metricsAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Metrics endpoint accessed (development mode - no auth required)',
      ip: req.ip,
      userAgent: req.get('user-agent'),
    }));
    return next();
  }

  const metricsToken = process.env.METRICS_AUTH_TOKEN;

  if (!metricsToken) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Metrics endpoint disabled - METRICS_AUTH_TOKEN not configured',
      recommendation: 'Set METRICS_AUTH_TOKEN environment variable in production',
    }));
    res.status(503).json({
      error: 'Metrics endpoint unavailable',
      message: 'Metrics authentication not configured',
    });
    return;
  }

  const authHeader = req.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message: 'Metrics endpoint access denied - missing or invalid Authorization header',
      ip: req.ip,
      userAgent: req.get('user-agent'),
    }));
    res.status(401).json({
      error: 'Authentication required',
      message: 'Metrics endpoint requires bearer token authentication in production',
    });
    return;
  }

  const providedToken = authHeader.substring(7);

  if (providedToken !== metricsToken) {
    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message: 'Metrics endpoint access denied - invalid token',
      ip: req.ip,
      userAgent: req.get('user-agent'),
    }));
    res.status(403).json({
      error: 'Invalid authentication token',
      message: 'Provided token does not match configured METRICS_AUTH_TOKEN',
    });
    return;
  }

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Metrics endpoint accessed (production mode - authenticated)',
    ip: req.ip,
    userAgent: req.get('user-agent'),
  }));
  next();
}
