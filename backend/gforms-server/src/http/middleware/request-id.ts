import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Request ID Middleware
 *
 * Phase 5.1 - Week 3, Task 3.3: Request Correlation IDs (Issue #13)
 *
 * Generates or uses existing X-Request-ID header for request correlation.
 * This enables distributed tracing across microservices and log aggregation.
 *
 * Features:
 * - Accepts existing X-Request-ID from client (for tracing across services)
 * - Generates UUID v4 if no ID provided
 * - Attaches ID to req.id for access in route handlers
 * - Adds ID to response headers
 * - Used in all log statements for correlation
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
 * Generates or uses X-Request-ID for request correlation
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Use existing X-Request-ID from client, or generate new one
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();

  // Attach to request object
  req.id = requestId;

  // Add to response headers for client correlation
  res.setHeader('X-Request-ID', requestId);

  next();
}

/**
 * Get request ID from request object
 * Utility function for use in route handlers
 */
export function getRequestId(req: Request): string {
  return req.id || 'unknown';
}
