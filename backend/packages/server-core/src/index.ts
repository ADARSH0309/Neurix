/**
 * @neurix/server-core
 *
 * Shared HTTP/OAuth/session infrastructure for all Neurix MCP servers.
 */

// Core types and interfaces
export type {
  ServerDefinition,
  ServiceFactory,
  ServiceClient,
  McpAdapter,
  OAuthConfig,
  OAuthTokenSet,
} from './types.js';

// Main entry point — each server calls startServer(definition)
export { startServer } from './http/index.js';

// HTTP server factory (for advanced usage)
export { createHttpServer, startHttpServer } from './http/server.js';

// Session infrastructure
export { initializeRedis, closeRedis, getRedisClient, isUsingMemoryStore } from './session/redis-client.js';
export { sessionManager } from './session/index.js';
export { startCleanupScheduler, stopCleanupScheduler } from './session/cleanup-scheduler.js';

// Re-export session types
export type { OAuthTokens, Session } from './session/types.js';

// Utilities
export { maskSensitiveData } from './utils/pii-masker.js';
export { encrypt, decrypt } from './utils/encryption.js';
