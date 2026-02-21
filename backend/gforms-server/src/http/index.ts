import { startHttpServer } from './server.js';
import { initializeRedis, closeRedis } from '../session/redis-client.js';
import { startCleanupScheduler, stopCleanupScheduler } from '../session/cleanup-scheduler.js';
import { sseConnectionManager } from './sse/connection-manager.js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * HTTP Server Entry Point
 *
 * Usage:
 *   node dist/http/index.js
 *
 * Environment Variables:
 *   PORT - Server port (default: 3000)
 *   GOOGLE_CLIENT_ID - Google OAuth client ID
 *   GOOGLE_CLIENT_SECRET - Google OAuth client secret
 *   GOOGLE_REDIRECT_URI - OAuth redirect URI
 *   REDIS_URL - Redis connection URL
 *   NODE_ENV - Environment (development, production)
 */

async function main() {
  // Validate required environment variables
  const requiredEnvVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REDIRECT_URI',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Missing required environment variables',
      missing: missingVars,
    }));
    process.exit(1);
  }

  // Get port from environment or use default
  const port = parseInt(process.env.PORT || '3000', 10);

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Starting Google Forms MCP Server (Phase 2 - OAuth with Sessions)',
    port,
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

  // Prepare server configuration (Phase 2: no tokenPath, using sessions)
  const config = {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_REDIRECT_URI!,
  };

  // Start the server
  startHttpServer(config, port);

  // Phase 5.1 - Week 3, Task 3.4: Start session cleanup scheduler (Issue #14)
  startCleanupScheduler();
}

// Handle graceful shutdown (Bug #3 Fix: Added SSE connection manager shutdown)
process.on('SIGTERM', async () => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Received SIGTERM, shutting down gracefully',
  }));

  // Phase 5.1 - Week 3, Task 3.4: Stop cleanup scheduler (Issue #14)
  stopCleanupScheduler();

  // Shutdown SSE connections first
  await sseConnectionManager.shutdown();

  // Then close Redis
  await closeRedis();

  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Received SIGINT, shutting down gracefully',
  }));

  // Phase 5.1 - Week 3, Task 3.4: Stop cleanup scheduler (Issue #14)
  stopCleanupScheduler();

  // Shutdown SSE connections first
  await sseConnectionManager.shutdown();

  // Then close Redis
  await closeRedis();

  process.exit(0);
});

// Handle uncaught exceptions (CRITICAL-003 Fix)
process.on('uncaughtException', async (error: Error) => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'fatal',
    message: 'Uncaught exception - shutting down',
    error: error.message,
    stack: error.stack,
    type: 'uncaughtException',
  }));

  try {
    // Attempt graceful shutdown
    stopCleanupScheduler();
    await sseConnectionManager.shutdown();
    await closeRedis();
  } catch (shutdownError) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'fatal',
      message: 'Error during emergency shutdown',
      error: shutdownError instanceof Error ? shutdownError.message : 'Unknown error',
    }));
  }

  process.exit(1);
});

// Handle unhandled promise rejections (CRITICAL-003 Fix)
process.on('unhandledRejection', async (reason: unknown, promise: Promise<unknown>) => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'fatal',
    message: 'Unhandled promise rejection - shutting down',
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    type: 'unhandledRejection',
  }));

  try {
    // Attempt graceful shutdown
    stopCleanupScheduler();
    await sseConnectionManager.shutdown();
    await closeRedis();
  } catch (shutdownError) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'fatal',
      message: 'Error during emergency shutdown',
      error: shutdownError instanceof Error ? shutdownError.message : 'Unknown error',
    }));
  }

  process.exit(1);
});

// Start the server
main().catch((error) => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'error',
    message: 'Failed to start server',
    error: error.message,
    stack: error.stack,
  }));
  process.exit(1);
});
