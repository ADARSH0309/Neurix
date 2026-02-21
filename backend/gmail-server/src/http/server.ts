/**
 * Gmail MCP Server - HTTP Server Setup
 *
 * Creates and configures the Express application with middleware, routes, and OAuth.
 */

import express, { type Express } from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { GmailClient } from '../gmail-client.js';
import { McpHttpAdapter } from './mcp-adapter.js';
import { createOAuth2Client } from './oauth/config.js';
import {
  corsMiddleware,
  cookieMiddleware,
  mcpJsonParser,
  requestLogger,
  errorHandler,
} from './middleware.js';
import { createHealthCheckHandler } from './routes/health.js';
import { createMcpHandler } from './routes/mcp.js';
import { createLoginHandler, createCallbackHandler } from './routes/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface GmailHttpConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  tokenPath: string;
}

export async function createHttpServer(config: GmailHttpConfig): Promise<Express> {
  const app = express();

  // Shared state
  let isAuthenticated = false;
  let pendingRedirectUri: string | null = null;

  // Initialize Gmail client
  const gmailClient = new GmailClient(config.clientId, config.clientSecret, config.redirectUri, config.tokenPath);

  // Check if already authenticated
  try {
    await gmailClient.initialize();
    isAuthenticated = true;
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Gmail client initialized with existing tokens',
    }));
  } catch {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message: 'No existing tokens found. OAuth required.',
    }));
  }

  // Create MCP adapter
  const mcpAdapter = new McpHttpAdapter(gmailClient);

  // Create OAuth2 client
  const oauth2Client = createOAuth2Client(config.clientId, config.clientSecret, config.redirectUri);

  // Middleware
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(corsMiddleware);
  app.use(cookieMiddleware);

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later' },
  });
  app.use(limiter);

  // Request logging
  app.use(requestLogger);

  // Health check
  app.get('/health', createHealthCheckHandler(() => isAuthenticated));

  // Auth routes
  const authDeps = {
    oauth2Client,
    gmailClient,
    tokenPath: config.tokenPath,
    setAuthenticated: (value: boolean) => { isAuthenticated = value; },
    getPendingRedirectUri: () => pendingRedirectUri,
    setPendingRedirectUri: (uri: string | null) => { pendingRedirectUri = uri; },
  };

  app.get('/auth/login', createLoginHandler(authDeps));
  app.get(
    ['/oauth/callback', '/auth/gmail/callback', '/auth/g-mail/callback', '/oauth2callback'],
    createCallbackHandler(authDeps)
  );

  // MCP JSON-RPC endpoint
  app.post('/', mcpJsonParser, createMcpHandler(mcpAdapter, () => isAuthenticated));

  // Serve test page
  app.use(express.static(join(__dirname, 'public')));

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}

export function startHttpServer(config: GmailHttpConfig, port: number): void {
  createHttpServer(config).then((app) => {
    app.listen(port, () => {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Gmail MCP Server (HTTP) listening on port ${port}`,
      }));
      console.log(`\nServer running at http://localhost:${port}`);
      console.log(`Health check: http://localhost:${port}/health`);
      console.log(`OAuth login: http://localhost:${port}/auth/login`);
      console.log(`Test page: http://localhost:${port}/test.html`);
    });
  }).catch((error) => {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Failed to start HTTP server',
      error: error instanceof Error ? error.message : String(error),
    }));
    process.exit(1);
  });
}
