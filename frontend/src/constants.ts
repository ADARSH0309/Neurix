/**
 * Application-wide constants
 */

export const APP_NAME = 'Neurix';
export const APP_VERSION = '1.0.0';
export const APP_DESCRIPTION = 'Enterprise MCP Chat Interface Platform';

// MCP Server ports
export const SERVER_PORTS = {
  gdrive: 8080,
  gforms: 8081,
  gmail: 8082,
  gcalendar: 8083,
  gtask: 8084,
  gsheets: 8085,
} as const;

// Session storage keys
export const STORAGE_KEYS = {
  SESSIONS: 'neurix_sessions',
  THEME: 'neurix_theme',
  AUTH_PENDING: 'mcp_auth_pending',
  TOKEN_PREFIX: 'mcp_token_',
} as const;

// API Configuration
export const AI_CONFIG = {
  MODEL: 'llama-3.3-70b-versatile',
  PROVIDER: 'groq',
  MAX_TOKENS: 4096,
} as const;

// Rate limits
export const LIMITS = {
  MAX_MESSAGE_LENGTH: 10000,
  MAX_SESSIONS: 100,
  MAX_MESSAGES_PER_SESSION: 500,
} as const;
