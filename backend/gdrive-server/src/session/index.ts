/**
 * Session Management Module
 *
 * Exports:
 * - Session types and interfaces
 * - Redis client management
 * - SessionManager singleton
 */

export * from './types.js';
export * from './redis-client.js';
export { SessionManager, sessionManager } from './session-manager.js';
