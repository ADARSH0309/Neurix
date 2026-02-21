import express, { Express } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import { maskSensitiveData } from '../utils/pii-masker.js';
import {
  corsMiddleware,
  healthCheckCorsMiddleware,
  oauthTokenCorsMiddleware,
  cookieMiddleware,
  mcpJsonParser,
  authJsonParser,
  authBodyParser,
  defaultJsonParser,
  requestLogger,
  errorHandler,
  requestIdMiddleware,
} from './middleware.js';
import {
  authLimiter,
  apiLimiter,
  tokenGenerationLimiter,
  sseLimiter,
  generalLimiter,
  gdprDeletionLimiter,
  gdprExportLimiter,
} from './middleware/rate-limiters.js';
import { metricsAuthMiddleware } from './middleware/metrics-auth.js';
import { handleHealthCheck } from './routes/health.js';
import { handleMetrics } from './routes/metrics.js';
import { handleSessionMcpRequest, initializeSessionMcp } from './routes/mcp-session.js';
import {
  initializeOAuthClient,
  handleLogin,
  handleOAuthCallback,
  handleAuthStatus,
  handleLogout,
} from './oauth/index.js';
import {
  handleGenerateToken,
  handleRevokeToken,
  handleListTokens,
  handleRevokeAllTokens,
  handleGetTokenInfo,
} from './routes/token.js';
import { tokenManager } from './auth/token-manager.js';
import { requireAuth, optionalAuth } from './auth/middleware.js';
import { handleDeleteUserData, handleExportUserData } from './routes/gdpr.js';
import sseRoutes from './sse/routes.js';
import mcpSseRoutes, { initializeSseMcp } from './routes/mcp-sse.js';
import mcpStreamableRoutes, { initializeStreamableHttp } from './routes/mcp-streamable.js';
import oauthDiscoveryRoutes from './routes/oauth-discovery.js';
import oauthRegisterRoutes from './routes/oauth-register.js';
import { validateBody, validateParams, validateQuery, securityCheck } from './validation/middleware.js';
import { schemas } from './validation/schemas.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * MCP Server Configuration (Phase 2)
 */
export interface McpServerConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * Create and configure Express application
 */
export async function createHttpServer(config: McpServerConfig): Promise<Express> {
  const app = express();

  // Trust proxy - Required for ALB/load balancer (get correct client IP from X-Forwarded-For)
  // Phase 2: AWS ECS behind Application Load Balancer
  app.set('trust proxy', true);

  // Initialize OAuth client (for /auth/login and /oauth2callback)
  initializeOAuthClient({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUri: config.redirectUri,
  });

  // Initialize session-based MCP handler
  initializeSessionMcp(
    config.clientId,
    config.clientSecret,
    config.redirectUri
  );

  // Initialize SSE MCP handler with OAuth config
  initializeSseMcp(
    config.clientId,
    config.clientSecret,
    config.redirectUri
  );

  // Initialize Streamable HTTP MCP handler (2025-03-26 spec)
  initializeStreamableHttp(
    config.clientId,
    config.clientSecret,
    config.redirectUri
  );

  // Initialize token manager for Phase 3 bearer token auth
  tokenManager.initialize().catch((err) => {
    console.error(JSON.stringify(maskSensitiveData({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Failed to initialize token manager',
      error: err.message,
    })));
  });

  // Initialize client registration manager for DCR
  const { clientRegistrationManager } = await import('./oauth/client-registration.js');
  clientRegistrationManager.initialize().catch((err) => {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Failed to initialize client registration manager',
      error: err.message,
    }));
  });

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'OAuth, session-based MCP, SSE MCP, Streamable HTTP, token manager, and DCR initialized',
    clientId: config.clientId,
    redirectUri: config.redirectUri,
  }));

  // Phase 5.1 - Week 3, Task 3.3: Request Correlation IDs (Issue #13)
  // Apply request ID middleware FIRST to ensure all requests have correlation IDs
  // This must be before ALL other middleware to ensure IDs are available for logging
  app.use(requestIdMiddleware);

  // Apply request logger immediately after request ID middleware to log ALL requests
  // Must be before route definitions to ensure all routes are logged
  app.use(requestLogger);

  // Phase 5.1 - Week 2, Task 2.3: CORS Hardening (Issue #8)
  // Define /health, /metrics, and /test BEFORE global CORS middleware to allow no-origin requests
  // These endpoints use permissive CORS for monitoring tools (Prometheus, ALB health checks)
  // and internal testing tools
  app.get('/health', healthCheckCorsMiddleware, handleHealthCheck);

  // SECURITY FIX: Phase 2 - Protect /metrics endpoint (HIGH Priority)
  // Apply environment-aware authentication to metrics endpoint
  // Development: No auth required | Production: Bearer token required
  app.get('/metrics', healthCheckCorsMiddleware, metricsAuthMiddleware, handleMetrics);

  // Test interface - uses permissive CORS for easy access from browsers
  app.get('/test', healthCheckCorsMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'test.html'));
  });

  // OAuth GET endpoints - use permissive CORS for browser navigation
  // Users navigate directly to these URLs, so no Origin header is sent
  app.get('/auth/login', healthCheckCorsMiddleware, authLimiter, handleLogin);
  app.get('/oauth2callback', healthCheckCorsMiddleware, authLimiter, validateQuery(schemas.oauthCallback), handleOAuthCallback);
  // Google Forms specific callback paths
  app.get('/auth/google-forms/callback', healthCheckCorsMiddleware, authLimiter, validateQuery(schemas.oauthCallback), handleOAuthCallback);
  app.get('/auth/g-forms/callback', healthCheckCorsMiddleware, authLimiter, validateQuery(schemas.oauthCallback), handleOAuthCallback);
  // /auth/status needs cookies, so apply cookieMiddleware explicitly
  app.get('/auth/status', healthCheckCorsMiddleware, cookieMiddleware, handleAuthStatus);

  // Root GET endpoint - info page accessible from browsers
  app.get('/', healthCheckCorsMiddleware, (req, res) => {
    res.json({
      name: 'Google Forms MCP Server',
      version: '1.0.0',
      transport: 'http',
      phase: 3,
      features: ['OAuth 2.0', 'Session Management', 'Bearer Token Auth', 'SSE Support'],
      endpoints: {
        health: '/health',
        mcp: 'POST / (requires authentication: cookie OR bearer token)',
        sse: {
          connect: 'GET /sse (establish SSE connection for MCP Inspector)',
          stats: 'GET /sse/stats (connection statistics)',
          mcpPost: 'POST /mcp/:connectionId (send MCP request via SSE)',
        },
        auth: {
          login: 'GET /auth/login (start OAuth flow)',
          callback: 'GET /oauth2callback (OAuth callback)',
          status: 'GET /auth/status (check auth status)',
          logout: 'POST /auth/logout (logout)',
        },
        tokens: {
          generate: 'POST /api/generate-token (generate bearer token)',
          list: 'GET /api/tokens (list your tokens)',
          info: 'GET /api/token/:token (get token info)',
          revoke: 'DELETE /api/token/:token (revoke specific token)',
          revokeAll: 'DELETE /api/tokens (revoke all tokens)',
        },
        test: 'GET /test (web test interface)',
      },
      documentation: 'https://github.com/neurix/mcp-servers',
      mcpInspector: {
        transport: 'SSE',
        url: 'GET /sse with Authorization header',
        postEndpoint: 'Provided by server in endpoint event',
      },
    });
  });

  // Token GET endpoints - accessible from test page
  // These need permissive CORS for browser navigation AND cookies for session access
  app.get('/api/tokens', healthCheckCorsMiddleware, cookieMiddleware, handleListTokens);

  // MCP Streamable HTTP GET endpoint - OAuth discovery (must be before global CORS)
  // This endpoint needs to be accessible without Origin header for MCP Inspector OAuth discovery
  app.get('/mcp', healthCheckCorsMiddleware, optionalAuth(), async (req, res) => {
    const authReq = req as any;

    // Check if authenticated
    if (!authReq.session || !authReq.session.authenticated) {
      // Return WWW-Authenticate challenge for OAuth 2.1 discovery
      const protocol = req.get('X-Forwarded-Proto') || req.protocol;
      const host = req.get('host');
      const baseUrl = `${protocol}://${host}`;

      res.status(401)
        .set('WWW-Authenticate', `Bearer realm="${baseUrl}", ` +
          `authorization_uri="${baseUrl}/auth/login", ` +
          `token_uri="${baseUrl}/api/generate-token", ` +
          `resource="${baseUrl}/mcp", ` +
          `scope="https://www.googleapis.com/auth/forms.body https://www.googleapis.com/auth/forms.responses.readonly https://www.googleapis.com/auth/drive.file"`)
        .json({
          error: 'Authentication required',
          message: 'Please authenticate using OAuth 2.1 with PKCE',
          oauth_discovery: `${baseUrl}/.well-known/oauth-authorization-server`,
          resource_discovery: `${baseUrl}/.well-known/oauth-protected-resource/mcp`,
          client_registration: `${baseUrl}/oauth/register`,
        });

      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Unauthenticated MCP connection attempt - returned OAuth discovery info',
        userAgent: req.get('user-agent'),
        ip: req.ip,
      }));

      return;
    }

    const userEmail = authReq.session?.userEmail;
    if (!userEmail) {
      res.status(401).json({
        error: 'User email not found in session. Please re-authenticate.',
      });
      return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // CORS headers
    if (req.headers.origin) {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    // Generate or reuse session ID
    const sessionId = authReq.sessionId || require('crypto').randomUUID();

    // Send Mcp-Session-Id header
    res.setHeader('Mcp-Session-Id', sessionId);

    res.flushHeaders();

    // Create SSE connection
    const { sseConnectionManager } = await import('./sse/connection-manager.js');
    const connectionId = sseConnectionManager.createConnection(userEmail, res);

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Streamable HTTP SSE connection established',
      connectionId,
      sessionId,
      userEmail,
    }));

    // Handle client disconnect
    req.on('close', () => {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Streamable HTTP SSE connection closed',
        connectionId,
        sessionId,
      }));
      sseConnectionManager.removeConnection(connectionId);
    });

    // Handle errors
    res.on('error', (error) => {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Streamable HTTP SSE connection error',
        connectionId,
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
      sseConnectionManager.removeConnection(connectionId);
    });
  });

  // CRITICAL: Cookie middleware MUST be applied before MCP routes
  // because authentication middleware (used by POST /mcp) reads req.cookies
  app.use(cookieMiddleware);

  // Streamable HTTP endpoint (2025-03-26 spec) - unified POST/DELETE on /mcp
  // NOTE: GET /mcp is handled by inline route above. POST/DELETE must be registered here
  // BEFORE global CORS middleware to support requests without Origin header from MCP Inspector
  app.use(mcpStreamableRoutes);

  // CRITICAL: OAuth 2.0 Dynamic Client Registration (RFC 7591) MUST be BEFORE global CORS
  // This is a server-to-server protocol that does NOT send Origin headers
  // Registering it AFTER CORS would block all DCR requests with "No Origin header" error
  app.use(oauthRegisterRoutes);

  // CRITICAL: OAuth 2.0 Token Exchange (RFC 6749 Section 4.1.3) needs CUSTOM CORS
  // Production Issue Fix: /api/generate-token was getting 500 error for server-to-server requests
  // Server-to-server OAuth token exchange does NOT send Origin headers
  // We apply route-specific CORS and register the route BEFORE global CORS
  // ROOT CAUSE FIX: Use authBodyParser to support BOTH application/json AND application/x-www-form-urlencoded
  // MCP Inspector sends form-encoded data (per RFC 6749), some clients send JSON
  app.post('/api/generate-token', oauthTokenCorsMiddleware, ...authBodyParser, tokenGenerationLimiter, securityCheck, handleGenerateToken);

  // Apply global CORS middleware - SKIPS paths with their own CORS middleware
  // This middleware applies to ALL routes, but we've already handled CORS for /api/generate-token above
  // Express processes middleware in order, so the route-specific CORS runs first
  app.use((req, res, next) => {
    // Skip global CORS for routes that have their own CORS middleware
    if (req.path === '/api/generate-token') {
      return next();
    }
    corsMiddleware(req, res, next);
  });

  // Apply security headers (Phase 4.2 - Security Headers with Helmet.js)
  // Phase 5.6 - HIGH Priority: Allow unsafe-inline for test page (internal tool)
  const isDevelopment = process.env.NODE_ENV === 'development';

  app.use(
    helmet({
      // Content Security Policy - Prevent XSS and injection attacks
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // Allow unsafe-inline for test page (internal testing tool, not user-facing)
          scriptSrc: ["'self'", "'unsafe-inline'"],
          scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers for test page
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      // HTTP Strict Transport Security - Force HTTPS (365 days)
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      // Prevent clickjacking attacks
      frameguard: {
        action: 'deny',
      },
      // Prevent MIME type sniffing
      noSniff: true,
      // Disable X-Powered-By header
      hidePoweredBy: true,
      // Referrer Policy - Control referrer information
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },
      // Cross-Origin policies
      crossOriginEmbedderPolicy: false, // Disable for OAuth flows
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }, // Allow OAuth popups
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow CORS
    })
  );

  // NOTE: cookieMiddleware now applied BEFORE mcpStreamableRoutes (see line 308)
  // to ensure req.cookies is available for authentication middleware

  // NOTE: JSON body parser removed from global middleware (Phase 5.1 - Task 1.3)
  // Applied per-route with granular size limits to prevent memory exhaustion
  app.use(express.urlencoded({ extended: true })); // Support form-encoded OAuth token requests

  // Apply global rate limiter (Phase 4.1 - Rate Limiting)
  app.use(generalLimiter);

  // OAuth 2.1 discovery endpoints (must be before other routes)
  app.use(oauthDiscoveryRoutes);

  // NOTE: oauthRegisterRoutes moved to BEFORE global CORS middleware (see line ~320)
  // to allow server-to-server DCR requests without Origin header

  // OAuth endpoints (with rate limiting to prevent brute-force attacks)
  // Phase 5.1 - CRITICAL Security: Input validation with Zod
  app.get('/auth/login', authLimiter, handleLogin);
  app.get('/oauth2callback', authLimiter, validateQuery(schemas.oauthCallback), handleOAuthCallback);
  app.get('/auth/status', handleAuthStatus);
  // Phase 5.1 - Task 1.3: Granular 100KB default limit for logout
  app.post('/auth/logout', defaultJsonParser, handleLogout);

  // Token management endpoints (Phase 3 - Bearer Token Auth)
  // Note: /api/generate-token was moved BEFORE global CORS middleware (see line ~330) to support server-to-server token exchange
  // Note: GET /api/tokens moved before global CORS middleware (line 200) for browser accessibility
  app.delete('/api/tokens', handleRevokeAllTokens);
  app.get('/api/token/:token', validateParams(schemas.tokenParam), handleGetTokenInfo);
  app.delete('/api/token/:token', validateParams(schemas.tokenParam), handleRevokeToken);

  // GDPR Compliance endpoints (Phase 5.2 - GDPR Article 17 & 20)
  // DELETE: Right to Erasure (Article 17) - Deletes all user data and revokes OAuth tokens
  // GET: Right to Portability (Article 20) - Exports user data in machine-readable JSON format
  app.delete('/api/gdpr/user-data', requireAuth(), gdprDeletionLimiter, handleDeleteUserData);
  app.get('/api/gdpr/user-data', requireAuth(), gdprExportLimiter, handleExportUserData);

  // SSE endpoints for MCP Inspector (Phase 3 - MCP HTTP+SSE Transport)
  app.use(sseRoutes);
  app.use(mcpSseRoutes);

  // MCP JSON-RPC endpoint (requires authentication: bearer token OR cookie)
  // Phase 5.1 - CRITICAL Security: Input validation with Zod
  // Phase 5.1 - Task 1.3: Granular 1MB limit for MCP requests (may include email content)
  app.post('/', mcpJsonParser, requireAuth(), apiLimiter, validateBody(schemas.jsonRpcRequest), handleSessionMcpRequest);

  // Root endpoint info (GET only, POST goes to MCP)
  app.get('/', (req, res) => {
    res.json({
      name: 'Google Forms MCP Server',
      version: '1.0.0',
      transport: 'http',
      phase: 3,
      features: ['OAuth 2.0', 'Session Management', 'Bearer Token Auth', 'SSE Support'],
      endpoints: {
        health: '/health',
        mcp: 'POST / (requires authentication: cookie OR bearer token)',
        sse: {
          connect: 'GET /sse (establish SSE connection for MCP Inspector)',
          stats: 'GET /sse/stats (connection statistics)',
          mcpPost: 'POST /mcp/:connectionId (send MCP request via SSE)',
        },
        auth: {
          login: 'GET /auth/login (start OAuth flow)',
          callback: 'GET /oauth2callback (OAuth callback)',
          status: 'GET /auth/status (check auth status)',
          logout: 'POST /auth/logout (logout)',
        },
        tokens: {
          generate: 'POST /api/generate-token (generate bearer token)',
          list: 'GET /api/tokens (list your tokens)',
          info: 'GET /api/token/:token (get token info)',
          revoke: 'DELETE /api/token/:token (revoke specific token)',
          revokeAll: 'DELETE /api/tokens (revoke all tokens)',
        },
        test: 'GET /test (web test interface)',
      },
      documentation: 'https://github.com/neurix/mcp-servers',
      mcpInspector: {
        transport: 'SSE',
        url: 'GET /sse with Authorization header',
        postEndpoint: 'Provided by server in endpoint event',
      },
    });
  });

  // Error handling (must be last)
  app.use(errorHandler);

  return app;
}

/**
 * Start HTTP server
 */
export async function startHttpServer(config: McpServerConfig, port: number = 3000): Promise<void> {
  const app = await createHttpServer(config);

  app.listen(port, () => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      message: 'Google Forms MCP Server started (Phase 3 - SSE Support)',
      port,
      transport: 'http',
      authentication: 'OAuth 2.0, Bearer Tokens, Redis sessions',
      endpoints: {
        health: `http://localhost:${port}/health`,
        login: `http://localhost:${port}/auth/login`,
        mcp: `http://localhost:${port}/`,
        sse: `http://localhost:${port}/sse`,
        docs: `http://localhost:${port}/`,
      },
    }));
  });
}
