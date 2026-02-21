import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { requestIdMiddleware, getRequestId } from './middleware/request-id.js';

/**
 * Configure CORS middleware
 * Allows MCP Inspector and browser-based clients
 *
 * Phase 5.1 - Week 2, Task 2.3: CORS Hardening (Issue #8)
 * Only allow no-origin requests for /health endpoint. All other endpoints
 * require a valid Origin header to prevent CORS bypass attacks.
 */
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Phase 5.1 - Week 2, Task 2.3: CORS Hardening (Issue #8)
    // Only allow no-origin requests for specific safe endpoints
    if (!origin) {
      // IMPORTANT: We need access to req to check the path, but cors library
      // doesn't provide it directly in the origin function. We'll use a different
      // approach: use dynamic CORS based on path in the route configuration instead.
      // For now, reject no-origin requests (except for SSE/curl which need them).
      // This is more secure - legitimate browser requests always have Origin header.
      return callback(new Error('No Origin header - requests must come from a browser with Origin header'));
    }

    // Allow official MCP Inspector
    if (origin === 'https://inspector.modelcontextprotocol.io') {
      return callback(null, true);
    }

    // Allow any localhost origin (for MCP Inspector running locally)
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }

    // Allow the server's own origin (for /test page)
    // Support both environment variable and dynamically constructed URL
    const serverUrl = process.env.SERVER_URL;
    if (serverUrl && origin === serverUrl) {
      return callback(null, true);
    }

    // Allow same-origin requests (test page accessing MCP endpoint on same domain)
    // Format: https://gforms-mcp.daffyos.in
    if (origin.startsWith('https://gforms-mcp.daffyos.in') ||
        origin.startsWith('http://gforms-mcp.daffyos.in')) {
      return callback(null, true);
    }

    // Allow gforms-agent-dev domain
    if (origin.startsWith('https://gforms-agent-dev.daffyos.in') ||
        origin.startsWith('http://gforms-agent-dev.daffyos.in')) {
      return callback(null, true);
    }

    // Reject other origins
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'OPTIONS', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'mcp-protocol-version'],
  exposedHeaders: ['Content-Type', 'Authorization', 'mcp-protocol-version'],
});

/**
 * Permissive CORS middleware for health check endpoint
 *
 * Phase 5.1 - Week 2, Task 2.3: CORS Hardening (Issue #8)
 * Health checks need to work without Origin header (from monitoring tools, curl, etc.)
 */
export const healthCheckCorsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin for health checks (monitoring tools, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Also allow any valid origin for health checks (public endpoint)
    return callback(null, true);
  },
  credentials: false, // No credentials needed for health checks
  methods: ['GET', 'OPTIONS'],
});

/**
 * Custom CORS middleware for OAuth 2.0 Dynamic Client Registration (RFC 7591)
 *
 * Supports BOTH:
 * 1. Server-to-server DCR (no Origin header) - RFC 7591 standard behavior
 * 2. Browser-based clients like MCP Inspector (with Origin header + CORS preflight)
 *
 * This middleware allows the endpoint to be used by both traditional OAuth servers
 * and modern browser-based MCP clients.
 */
export const oauthRegisterCorsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server OAuth DCR per RFC 7591)
    if (!origin) {
      return callback(null, true);
    }

    // Allow official MCP Inspector
    if (origin === 'https://inspector.modelcontextprotocol.io') {
      return callback(null, true);
    }

    // Allow any localhost origin (for MCP Inspector running locally)
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }

    // Allow the server's own origin (for /test page)
    const serverUrl = process.env.SERVER_URL;
    if (serverUrl && origin === serverUrl) {
      return callback(null, true);
    }

    // Allow same-origin requests
    if (origin.startsWith('https://gforms-mcp.daffyos.in') ||
        origin.startsWith('http://gforms-mcp.daffyos.in')) {
      return callback(null, true);
    }

    // Allow gforms-agent-dev domain
    if (origin.startsWith('https://gforms-agent-dev.daffyos.in') ||
        origin.startsWith('http://gforms-agent-dev.daffyos.in')) {
      return callback(null, true);
    }

    // Reject other origins
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Allow cookies for authenticated flows
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type'],
});

/**
 * Custom CORS middleware for OAuth 2.0 Token Exchange (RFC 6749 Section 4.1.3)
 *
 * Supports BOTH:
 * 1. Server-to-server token exchange (no Origin header) - RFC 6749 standard behavior
 * 2. Browser-based clients like MCP Inspector (with Origin header + CORS preflight)
 *
 * This middleware allows the /api/generate-token endpoint to be used by both traditional
 * OAuth servers and modern browser-based MCP clients.
 *
 * SECURITY FIX: Phase 2 - Fix /api/generate-token 500 error for server-to-server requests
 * Production Issue: Users connecting from different systems get 500 error after OAuth callback
 * Error: "No Origin header - requests must come from a browser with Origin header"
 */
export const oauthTokenCorsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server OAuth token exchange per RFC 6749)
    if (!origin) {
      return callback(null, true);
    }

    // Allow official MCP Inspector
    if (origin === 'https://inspector.modelcontextprotocol.io') {
      return callback(null, true);
    }

    // Allow any localhost origin (for MCP Inspector running locally)
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }

    // Allow the server's own origin (for /test page)
    const serverUrl = process.env.SERVER_URL;
    if (serverUrl && origin === serverUrl) {
      return callback(null, true);
    }

    // Allow same-origin requests
    if (origin.startsWith('https://gforms-mcp.daffyos.in') ||
        origin.startsWith('http://gforms-mcp.daffyos.in')) {
      return callback(null, true);
    }

    // Allow gforms-agent-dev domain
    if (origin.startsWith('https://gforms-agent-dev.daffyos.in') ||
        origin.startsWith('http://gforms-agent-dev.daffyos.in')) {
      return callback(null, true);
    }

    // Reject other origins
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Allow cookies for authenticated flows
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type'],
});

/**
 * Cookie parser middleware
 * Parses session cookies
 */
export const cookieMiddleware: RequestHandler = cookieParser();

/**
 * Granular JSON body parser configurations (Phase 5.1 - Week 1, Task 1.3)
 *
 * Route-specific body size limits to prevent memory exhaustion attacks.
 * Based on expected payload sizes for different endpoint categories.
 */

// MCP requests: 1MB limit (for JSON-RPC requests with email content)
export const mcpJsonParser = express.json({ limit: '1mb' });

// OAuth/Auth requests: 10KB limit (small auth payloads)
export const authJsonParser = express.json({ limit: '10kb' });

// OAuth token exchange dual-parser: Supports BOTH content types per RFC 6749
// MCP Inspector sends application/x-www-form-urlencoded
// Some OAuth clients send application/json
// Both parsers will be applied in sequence - Express skips parsers that don't match Content-Type
export const authBodyParser: RequestHandler[] = [
  express.json({ limit: '10kb' }),        // application/json
  express.urlencoded({ extended: true, limit: '10kb' })  // application/x-www-form-urlencoded
];

// Default for other POST routes: 100KB limit
export const defaultJsonParser = express.json({ limit: '100kb' });

/**
 * Request logging middleware
 * Phase 5.1 - Week 3, Task 3.3: Include request correlation ID in all logs (Issue #13)
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      requestId: req.id || 'unknown', // Request correlation ID for distributed tracing
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
