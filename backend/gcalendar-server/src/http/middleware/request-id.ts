import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Request ID Middleware
 */

declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();

  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);

  next();
}

export function getRequestId(req: Request): string {
  return req.id || 'unknown';
}
