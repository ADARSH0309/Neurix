import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Request ID Middleware
 *
 * Generates or uses existing X-Request-ID header for request correlation.
 */

declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

/**
 * Request ID middleware
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();

  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);

  next();
}

/**
 * Get request ID from request object
 */
export function getRequestId(req: Request): string {
  return req.id || 'unknown';
}
