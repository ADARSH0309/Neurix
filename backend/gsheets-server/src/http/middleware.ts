import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { requestIdMiddleware, getRequestId } from './middleware/request-id.js';

/**
 * Parse additional CORS origins from environment variable.
 */
function getAdditionalCorsOrigins(): string[] {
  const origins = process.env.CORS_ALLOWED_ORIGINS;
  if (!origins) return [];
  return origins.split(',').map(o => o.trim()).filter(Boolean);
}

/**
 * Check if an origin is allowed by CORS policy.
 */
export function isAllowedOrigin(origin: string): boolean {
  if (origin === 'https://inspector.modelcontextprotocol.io') return true;
  if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return true;
  const serverUrl = process.env.SERVER_URL;
  if (serverUrl && origin === serverUrl) return true;
  const additionalOrigins = getAdditionalCorsOrigins();
  for (const allowed of additionalOrigins) {
    if (origin === allowed || origin.startsWith(allowed)) return true;
  }
  return false;
}

/**
 * Configure CORS middleware
 */
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(new Error('No Origin header - requests must come from a browser with Origin header'));
    }

    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'mcp-protocol-version'],
  exposedHeaders: ['Content-Type', 'Authorization', 'mcp-protocol-version'],
});

/**
 * Permissive CORS middleware for health check endpoint
 */
export const healthCheckCorsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: false,
  methods: ['GET', 'OPTIONS'],
});

/**
 * Custom CORS middleware for OAuth 2.0 Dynamic Client Registration (RFC 7591)
 */
export const oauthRegisterCorsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type'],
});

/**
 * Custom CORS middleware for OAuth 2.0 Token Exchange (RFC 6749 Section 4.1.3)
 */
export const oauthTokenCorsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type'],
});

/**
 * Cookie parser middleware
 */
export const cookieMiddleware: RequestHandler = cookieParser();

/**
 * Granular JSON body parser configurations
 */

// MCP requests: 1MB limit (for JSON-RPC requests with spreadsheet content)
export const mcpJsonParser: RequestHandler = express.json({ limit: '1mb' });

// OAuth/Auth requests: 10KB limit
export const authJsonParser: RequestHandler = express.json({ limit: '10kb' });

// OAuth token exchange dual-parser
export const authBodyParser: RequestHandler[] = [
  express.json({ limit: '10kb' }),
  express.urlencoded({ extended: true, limit: '10kb' })
];

// Default for other POST routes: 100KB limit
export const defaultJsonParser: RequestHandler = express.json({ limit: '100kb' });

/**
 * CSRF Protection middleware
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (req.headers.authorization?.startsWith('Bearer ')) return next();
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (!origin) {
    res.status(403).json({ error: 'Forbidden', message: 'Missing Origin header' });
    return;
  }
  if (!isAllowedOrigin(origin)) {
    res.status(403).json({ error: 'Forbidden', message: 'Invalid origin' });
    return;
  }
  next();
}

/**
 * Request logging middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      requestId: req.id || 'unknown',
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent'),
    }));
  });

  next();
}

/**
 * Error handling middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  }));

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
  });
}

// Export request ID middleware
export { requestIdMiddleware, getRequestId };
