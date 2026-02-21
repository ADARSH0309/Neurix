/**
 * Metrics Endpoint Authentication Middleware
 *
 * SECURITY FIX: Phase 2 - Protect /metrics endpoint (HIGH Priority)
 * Security Audit Reference: CWE-306 (Missing Authentication for Critical Function)
 * Security Grade Impact: +2 points (B+ → A-)
 *
 * This middleware implements environment-aware authentication for the /metrics endpoint:
 * - Development: No authentication required (for easy debugging)
 * - Production: Requires bearer token authentication
 *
 * Configuration:
 * - METRICS_AUTH_TOKEN environment variable must be set in production
 * - If not set in production, the endpoint will be disabled for security
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Environment-aware metrics authentication middleware
 *
 * Development mode: Allows unrestricted access for debugging
 * Production mode: Requires bearer token in Authorization header
 */
export function metricsAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const isProduction = process.env.NODE_ENV === 'production';

  // Development mode: Allow access without authentication
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

  // Production mode: Require bearer token authentication
  const metricsToken = process.env.METRICS_AUTH_TOKEN;

  // If no token is configured in production, disable the endpoint for security
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

  // Extract bearer token from Authorization header
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

  const providedToken = authHeader.substring(7); // Remove 'Bearer ' prefix

  // Validate token
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

  // Token is valid - allow access
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Metrics endpoint accessed (production mode - authenticated)',
    ip: req.ip,
    userAgent: req.get('user-agent'),
  }));
  next();
}
