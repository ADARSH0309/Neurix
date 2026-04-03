/**
 * Generic HTTP Server Entry Point
 *
 * Each MCP server calls `startServer(definition)` to boot the full
 * Express stack with OAuth, Redis sessions, SSE, and MCP transports.
 *
 * Environment variable resolution order:
 *   PORT           → {SERVICE_ID}_PORT  → serverDef.port
 *   GOOGLE_REDIRECT_URI → {SERVICE_ID}_REDIRECT_URI → computed from port + callbackPath
 */

import { startHttpServer } from './server.js';
import { initializeRedis, closeRedis } from '../session/redis-client.js';
import { startCleanupScheduler, stopCleanupScheduler } from '../session/cleanup-scheduler.js';
import { sseConnectionManager } from './sse/connection-manager.js';
import * as dotenv from 'dotenv';
import type { ServerDefinition } from '../types.js';

dotenv.config();

/**
 * Resolve a config value from environment with fallback chain.
 * Checks: specific env var → service-prefixed env var → default value.
 */
function resolveEnv(serverDef: ServerDefinition, envKey: string, serviceKey: string, defaultValue: string): string {
  return process.env[envKey] || process.env[serviceKey] || defaultValue;
}

/**
 * Boot an MCP server with the given definition.
 * This is the single entry point each service calls.
 */
export async function startServer(serverDef: ServerDefinition): Promise<void> {
  const servicePrefix = serverDef.id.toUpperCase(); // e.g. 'GDRIVE', 'GMAIL'

  // Resolve port: PORT → GDRIVE_PORT → serverDef.port
  const port = parseInt(
    resolveEnv(serverDef, 'PORT', `${servicePrefix}_PORT`, String(serverDef.port)),
    10,
  );

  // Resolve redirect URI: GOOGLE_REDIRECT_URI → GDRIVE_REDIRECT_URI → computed
  const computedRedirectUri = `http://localhost:${port}/auth/${serverDef.callbackPath}/callback`;
  const redirectUri = resolveEnv(
    serverDef,
    'GOOGLE_REDIRECT_URI',
    `${servicePrefix}_REDIRECT_URI`,
    computedRedirectUri,
  );

  // Validate required env vars
  if (!process.env.GOOGLE_CLIENT_ID) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Missing required environment variable: GOOGLE_CLIENT_ID',
    }));
    process.exit(1);
  }

  if (!process.env.GOOGLE_CLIENT_SECRET) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Missing required environment variable: GOOGLE_CLIENT_SECRET',
    }));
    process.exit(1);
  }

  // Set GOOGLE_REDIRECT_URI in process.env so downstream code (redirect-validator, oauth) can read it
  process.env.GOOGLE_REDIRECT_URI = redirectUri;
  process.env.PORT = String(port);

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: `Starting ${serverDef.displayName}`,
    port,
    redirectUri,
    environment: process.env.NODE_ENV || 'development',
    redisConfigured: !!process.env.REDIS_URL,
  }));

  // Initialize Redis
  try {
    const redisConfig = process.env.REDIS_URL
      ? { url: process.env.REDIS_URL }
      : {
          host: process.env.REDIS_HOST,
          port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : undefined,
          password: process.env.REDIS_PASSWORD,
        };

    initializeRedis(redisConfig);

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Redis client initialized',
      connectionType: process.env.REDIS_URL ? 'url' : 'host/port',
    }));
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Failed to initialize Redis',
      error: error instanceof Error ? error.message : 'Unknown error',
    }));
    process.exit(1);
  }

  const config = {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri,
  };

  startHttpServer(config, serverDef, port);
  startCleanupScheduler();
}

// Graceful shutdown helpers
function setupGracefulShutdown(): void {
  const shutdown = async (signal: string) => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Received ${signal}, shutting down gracefully`,
    }));

    stopCleanupScheduler();
    await sseConnectionManager.shutdown();
    await closeRedis();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', async (error: Error) => {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'fatal',
      message: 'Uncaught exception - shutting down',
      error: error.message,
      stack: error.stack,
    }));

    try {
      stopCleanupScheduler();
      await sseConnectionManager.shutdown();
      await closeRedis();
    } catch { /* best effort */ }

    process.exit(1);
  });

  process.on('unhandledRejection', async (reason: unknown) => {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'fatal',
      message: 'Unhandled promise rejection - shutting down',
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    }));

    try {
      stopCleanupScheduler();
      await sseConnectionManager.shutdown();
      await closeRedis();
    } catch { /* best effort */ }

    process.exit(1);
  });
}

setupGracefulShutdown();
