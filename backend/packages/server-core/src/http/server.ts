import express, { Express } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import { randomUUID } from 'crypto';
import { maskSensitiveData } from '../utils/pii-masker.js';
import {
  corsMiddleware,
  healthCheckCorsMiddleware,
  oauthTokenCorsMiddleware,
  cookieMiddleware,
  mcpJsonParser,
  authBodyParser,
  defaultJsonParser,
  requestLogger,
  errorHandler,
  requestIdMiddleware,
  csrfProtection,
} from './middleware.js';
import {
  authLimiter,
  apiLimiter,
  tokenGenerationLimiter,
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
import type { ServerDefinition, OAuthConfig } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export { OAuthConfig as McpServerConfig };

/**
 * Create and configure Express application for any MCP server.
 */
export async function createHttpServer(config: OAuthConfig, serverDef: ServerDefinition): Promise<Express> {
  const app = express();
  const factory = serverDef.factory;

  // Trust first proxy (Railway's load balancer) — 'true' is rejected by express-rate-limit v8
  app.set('trust proxy', 1);

  // Initialize OAuth client
  initializeOAuthClient({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUri: config.redirectUri,
  });

  // Initialize all MCP transport handlers with service factory
  initializeSessionMcp(config.clientId, config.clientSecret, config.redirectUri, factory);
  initializeSseMcp(config.clientId, config.clientSecret, config.redirectUri, factory);
  initializeStreamableHttp(config.clientId, config.clientSecret, config.redirectUri, factory);

  // Initialize token manager
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
    message: `${serverDef.displayName}: OAuth, MCP transports, token manager, and DCR initialized`,
    clientId: config.clientId,
    redirectUri: config.redirectUri,
  }));

  // Request ID + logger FIRST
  app.use(requestIdMiddleware);
  app.use(requestLogger);

  // Health, metrics, test — BEFORE global CORS
  app.get('/health', healthCheckCorsMiddleware, handleHealthCheck);
  app.get('/metrics', healthCheckCorsMiddleware, metricsAuthMiddleware, handleMetrics);
  app.get('/test', healthCheckCorsMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'test.html'));
  });

  // OAuth GET endpoints — permissive CORS for browser navigation
  app.get('/auth/login', healthCheckCorsMiddleware, authLimiter, handleLogin);

  // Register all callback routes for this service
  const callbackRoutes = [
    '/oauth2callback',
    '/oauth/callback',
    '/auth/google/callback',
    `/auth/${serverDef.callbackPath}/callback`,
    '/auth/callback',
  ];
  for (const route of callbackRoutes) {
    app.get(route, healthCheckCorsMiddleware, authLimiter, validateQuery(schemas.oauthCallback), handleOAuthCallback);
  }

  app.get('/auth/status', healthCheckCorsMiddleware, cookieMiddleware, handleAuthStatus);

  // Root GET — info page
  app.get('/', healthCheckCorsMiddleware, (req, res) => {
    res.json({
      name: serverDef.displayName,
      version: '1.0.0',
      transport: 'http',
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
          callback: `/auth/${serverDef.callbackPath}/callback`,
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
    });
  });

  // Token GET endpoints
  app.get('/api/tokens', healthCheckCorsMiddleware, cookieMiddleware, handleListTokens);

  // MCP Streamable HTTP GET — OAuth discovery
  app.get('/mcp', healthCheckCorsMiddleware, optionalAuth(), async (req, res) => {
    const authReq = req as any;

    if (!authReq.session || !authReq.session.authenticated) {
      const protocol = req.get('X-Forwarded-Proto') || req.protocol;
      const host = req.get('host');
      const baseUrl = `${protocol}://${host}`;

      res.status(401)
        .set('WWW-Authenticate', `Bearer realm="${baseUrl}", ` +
          `authorization_uri="${baseUrl}/auth/login", ` +
          `token_uri="${baseUrl}/api/generate-token", ` +
          `resource="${baseUrl}/mcp", ` +
          `scope="${serverDef.scopes.join(' ')}"`)
        .json({
          error: 'Authentication required',
          message: 'Please authenticate using OAuth 2.1 with PKCE',
          oauth_discovery: `${baseUrl}/.well-known/oauth-authorization-server`,
          resource_discovery: `${baseUrl}/.well-known/oauth-protected-resource/mcp`,
          client_registration: `${baseUrl}/oauth/register`,
        });

      return;
    }

    const userEmail = authReq.session?.userEmail;
    if (!userEmail) {
      res.status(401).json({ error: 'User email not found in session. Please re-authenticate.' });
      return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    if (req.headers.origin) {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    const sessionId = authReq.sessionId || randomUUID();
    res.setHeader('Mcp-Session-Id', sessionId);
    res.flushHeaders();

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

    req.on('close', () => {
      sseConnectionManager.removeConnection(connectionId);
    });

    res.on('error', (error) => {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Streamable HTTP SSE connection error',
        connectionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
      sseConnectionManager.removeConnection(connectionId);
    });
  });

  // Cookie middleware MUST be applied before MCP routes
  app.use(cookieMiddleware);

  // Streamable HTTP endpoint
  app.use(mcpStreamableRoutes);

  // OAuth 2.0 Dynamic Client Registration MUST be BEFORE global CORS
  app.use(oauthRegisterRoutes);

  // OAuth Token Exchange
  app.post('/api/generate-token', oauthTokenCorsMiddleware, ...authBodyParser, tokenGenerationLimiter, securityCheck, handleGenerateToken);

  // Global CORS (skip for endpoints that have their own CORS middleware)
  app.use((req, res, next) => {
    if (req.path === '/api/generate-token') return next();
    if (req.path.startsWith('/auth/')) return next(); // auth routes use healthCheckCorsMiddleware
    corsMiddleware(req, res, next);
  });

  // Security headers
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
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      frameguard: { action: 'deny' },
      noSniff: true,
      hidePoweredBy: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  app.use(express.urlencoded({ extended: true }));
  app.use(generalLimiter);

  // OAuth 2.1 discovery
  app.use(oauthDiscoveryRoutes);

  // OAuth endpoints (post-CORS)
  app.get('/auth/login', authLimiter, handleLogin);
  for (const route of callbackRoutes) {
    app.get(route, authLimiter, validateQuery(schemas.oauthCallback), handleOAuthCallback);
  }
  app.get('/auth/status', handleAuthStatus);
  app.post('/auth/logout', csrfProtection, defaultJsonParser, handleLogout);

  // Token management
  app.delete('/api/tokens', csrfProtection, handleRevokeAllTokens);
  app.get('/api/token/:token', validateParams(schemas.tokenParam), handleGetTokenInfo);
  app.delete('/api/token/:token', csrfProtection, validateParams(schemas.tokenParam), handleRevokeToken);

  // GDPR Compliance
  app.delete('/api/gdpr/user-data', csrfProtection, requireAuth(), gdprDeletionLimiter, handleDeleteUserData);
  app.get('/api/gdpr/user-data', requireAuth(), gdprExportLimiter, handleExportUserData);

  // SSE endpoints
  app.use(sseRoutes);
  app.use(mcpSseRoutes);

  // MCP JSON-RPC endpoint
  app.post('/', mcpJsonParser, requireAuth(), apiLimiter, validateBody(schemas.jsonRpcRequest), handleSessionMcpRequest);

  // Root endpoint info (post-CORS)
  app.get('/', (req, res) => {
    res.json({
      name: serverDef.displayName,
      version: '1.0.0',
      transport: 'http',
      features: ['OAuth 2.0', 'Session Management', 'Bearer Token Auth', 'SSE Support'],
    });
  });

  app.use(errorHandler);

  return app;
}

/**
 * Start HTTP server for a given service definition.
 */
export async function startHttpServer(config: OAuthConfig, serverDef: ServerDefinition, port?: number): Promise<void> {
  const actualPort = port ?? serverDef.port;
  const app = await createHttpServer(config, serverDef);

  app.listen(actualPort, () => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      message: `${serverDef.displayName} started`,
      port: actualPort,
      transport: 'http',
      authentication: 'OAuth 2.0, Bearer Tokens, Redis sessions',
      endpoints: {
        health: `http://localhost:${actualPort}/health`,
        login: `http://localhost:${actualPort}/auth/login`,
        mcp: `http://localhost:${actualPort}/`,
        sse: `http://localhost:${actualPort}/sse`,
      },
    }));
  });
}
