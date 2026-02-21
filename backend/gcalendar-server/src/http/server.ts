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
 * MCP Server Configuration
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

  // Initialize token manager for bearer token auth
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

  // Apply request ID middleware FIRST to ensure all requests have correlation IDs
  app.use(requestIdMiddleware);

  // Apply request logger immediately after request ID middleware
  app.use(requestLogger);

  // Define /health, /metrics, and /test BEFORE global CORS middleware
  app.get('/health', healthCheckCorsMiddleware, handleHealthCheck);

  // Protect /metrics endpoint
  app.get('/metrics', healthCheckCorsMiddleware, metricsAuthMiddleware, handleMetrics);

  // Test interface - uses permissive CORS for easy access from browsers
  app.get('/test', healthCheckCorsMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'test.html'));
  });

  // OAuth GET endpoints - use permissive CORS for browser navigation
  app.get('/auth/login', healthCheckCorsMiddleware, authLimiter, handleLogin);
  app.get('/oauth2callback', healthCheckCorsMiddleware, authLimiter, validateQuery(schemas.oauthCallback), handleOAuthCallback);
  app.get('/oauth/callback', healthCheckCorsMiddleware, authLimiter, validateQuery(schemas.oauthCallback), handleOAuthCallback);
  app.get('/auth/google/callback', healthCheckCorsMiddleware, authLimiter, validateQuery(schemas.oauthCallback), handleOAuthCallback);
  app.get('/auth/g-calender/callback', healthCheckCorsMiddleware, authLimiter, validateQuery(schemas.oauthCallback), handleOAuthCallback);
  app.get('/calendar/callback', healthCheckCorsMiddleware, authLimiter, validateQuery(schemas.oauthCallback), handleOAuthCallback);
  app.get('/auth/callback', healthCheckCorsMiddleware, authLimiter, validateQuery(schemas.oauthCallback), handleOAuthCallback);
  app.get('/auth/status', healthCheckCorsMiddleware, cookieMiddleware, handleAuthStatus);

  // Root GET endpoint - info page accessible from browsers
  app.get('/', healthCheckCorsMiddleware, (req, res) => {
    res.json({
      name: 'Google Calendar MCP Server',
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
  app.get('/api/tokens', healthCheckCorsMiddleware, cookieMiddleware, handleListTokens);

  // MCP Streamable HTTP GET endpoint - OAuth discovery
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
          `scope="calendar.readonly calendar.events"`)
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

  // Cookie middleware MUST be applied before MCP routes
  app.use(cookieMiddleware);

  // Streamable HTTP endpoint (2025-03-26 spec)
  app.use(mcpStreamableRoutes);

  // OAuth 2.0 Dynamic Client Registration (RFC 7591) MUST be BEFORE global CORS
  app.use(oauthRegisterRoutes);

  // OAuth Token Exchange (RFC 6749 Section 4.1.3)
  app.post('/api/generate-token', oauthTokenCorsMiddleware, ...authBodyParser, tokenGenerationLimiter, securityCheck, handleGenerateToken);

  // Apply global CORS middleware
  app.use((req, res, next) => {
    if (req.path === '/api/generate-token') {
      return next();
    }
    corsMiddleware(req, res, next);
  });

  // Apply security headers (Helmet.js)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          scriptSrcAttr: ["'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      frameguard: {
        action: 'deny',
      },
      noSniff: true,
      hidePoweredBy: true,
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  app.use(express.urlencoded({ extended: true }));

  // Apply global rate limiter
  app.use(generalLimiter);

  // OAuth 2.1 discovery endpoints
  app.use(oauthDiscoveryRoutes);

  // OAuth endpoints
  app.get('/auth/login', authLimiter, handleLogin);
  app.get('/oauth2callback', authLimiter, validateQuery(schemas.oauthCallback), handleOAuthCallback);
  app.get('/oauth/callback', authLimiter, validateQuery(schemas.oauthCallback), handleOAuthCallback);
  app.get('/auth/google/callback', authLimiter, validateQuery(schemas.oauthCallback), handleOAuthCallback);
  app.get('/calendar/callback', authLimiter, validateQuery(schemas.oauthCallback), handleOAuthCallback);
  app.get('/auth/callback', authLimiter, validateQuery(schemas.oauthCallback), handleOAuthCallback);
  app.get('/auth/status', handleAuthStatus);
  app.post('/auth/logout', defaultJsonParser, handleLogout);

  // Token management endpoints
  app.delete('/api/tokens', handleRevokeAllTokens);
  app.get('/api/token/:token', validateParams(schemas.tokenParam), handleGetTokenInfo);
  app.delete('/api/token/:token', validateParams(schemas.tokenParam), handleRevokeToken);

  // GDPR Compliance endpoints (Article 17 & 20)
  app.delete('/api/gdpr/user-data', requireAuth(), gdprDeletionLimiter, handleDeleteUserData);
  app.get('/api/gdpr/user-data', requireAuth(), gdprExportLimiter, handleExportUserData);

  // SSE endpoints for MCP Inspector
  app.use(sseRoutes);
  app.use(mcpSseRoutes);

  // MCP JSON-RPC endpoint (requires authentication)
  app.post('/', mcpJsonParser, requireAuth(), apiLimiter, validateBody(schemas.jsonRpcRequest), handleSessionMcpRequest);

  // Root endpoint info
  app.get('/', (req, res) => {
    res.json({
      name: 'Google Calendar MCP Server',
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
export async function startHttpServer(config: McpServerConfig, port: number = 8083): Promise<void> {
  const app = await createHttpServer(config);

  app.listen(port, () => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      message: 'Google Calendar MCP Server started (Phase 3 - SSE Support)',
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
