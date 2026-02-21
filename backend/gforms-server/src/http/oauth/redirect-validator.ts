/**
 * OAuth Redirect URI Validator
 *
 * Validates redirect URIs against a whitelist to prevent open redirect vulnerabilities.
 *
 * Phase 5.1 - Week 1, Task 1.4: OAuth Redirect URI Whitelist Validation
 * Phase 5.1 - Week 2, Task 2.4: Dynamic Client Registration (DCR) Integration
 *
 * Security Benefits:
 * - Prevents attackers from redirecting users to malicious sites after OAuth
 * - Implements strict URI matching (exact match or pattern-based)
 * - Configurable via environment variable
 * - Includes sensible defaults for MCP Inspector and testing
 * - Supports OAuth 2.0 Dynamic Client Registration (RFC 7591)
 */

import { clientRegistrationManager } from './client-registration.js';

/**
 * Default allowed redirect URIs
 * These are always allowed regardless of environment configuration
 */
const DEFAULT_ALLOWED_URIS = [
  // MCP Inspector (official)
  'https://inspector.modelcontextprotocol.io/callback',

  // Local MCP Inspector (common ports)
  'http://localhost:5173',
  'http://localhost:5173/callback',
  'http://localhost:5173/oauth/callback',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5173/callback',
  'http://127.0.0.1:5173/oauth/callback',

  // MCP Inspector alternative ports
  'http://localhost:3001',
  'http://localhost:3001/oauth/callback',
  'http://localhost:3004',
  'http://localhost:3004/oauth/callback',
  'http://localhost:6274',
  'http://localhost:6274/oauth/callback',

  // Chat Interface
  'http://localhost:3000',
  'http://localhost:3000/',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3000/',

  // Local development testing
  'http://localhost:3000/test',
  'http://127.0.0.1:3000/test',
];

/**
 * Production allowed redirect URIs
 * These are added when in production mode
 */
const PRODUCTION_ALLOWED_URIS = [
  // Production test page
  'https://gmail-mcp.daffyos.in/test',

  // Gmail agent dev domain - all paths allowed
  'https://gmail-agent-dev.daffyos.in',
  'https://gmail-agent-dev.daffyos.in/callback',
  'https://gmail-agent-dev.daffyos.in/oauth/callback',
  'https://gmail-agent-dev.daffyos.in/oauth/initiate',
  'https://gmail-agent-dev.daffyos.in/test',
];

/**
 * Parse additional allowed URIs from environment variable
 *
 * Expected format: comma-separated list of URIs
 * Example: ALLOWED_REDIRECT_URIS=https://example.com/callback,https://app.example.com/oauth
 */
function getAdditionalAllowedUris(): string[] {
  const envUris = process.env.ALLOWED_REDIRECT_URIS;

  if (!envUris || envUris.trim() === '') {
    return [];
  }

  return envUris
    .split(',')
    .map(uri => uri.trim())
    .filter(uri => uri.length > 0);
}

/**
 * Get the complete list of allowed redirect URIs
 */
export function getAllowedRedirectUris(): string[] {
  const allowedUris = [...DEFAULT_ALLOWED_URIS];

  // Add production URIs if in production
  if (process.env.NODE_ENV === 'production') {
    allowedUris.push(...PRODUCTION_ALLOWED_URIS);
  }

  // Add environment-specified URIs
  allowedUris.push(...getAdditionalAllowedUris());

  return allowedUris;
}

/**
 * Check if a URI matches a pattern
 *
 * Supports:
 * - Exact match: https://example.com/callback
 * - Wildcard subdomain: https://*.example.com/callback (if needed in future)
 *
 * For now, we only support exact match for security
 */
function uriMatchesPattern(uri: string, pattern: string): boolean {
  // For now, only exact match (most secure)
  return uri === pattern;
}

/**
 * Validate a redirect URI against the whitelist and/or dynamically registered clients
 *
 * This function supports two validation paths:
 * 1. Static whitelist validation (for traditional OAuth flows)
 * 2. Dynamic Client Registration (RFC 7591) validation via Redis
 *
 * Phase 5.1 - Week 2, Task 2.4: DCR Integration
 *
 * @param redirectUri - The redirect URI to validate
 * @param clientId - Optional client ID for DCR clients. If provided, checks Redis for registered redirect URIs
 * @returns Promise<boolean> - true if the URI is allowed, false otherwise
 */
export async function isRedirectUriAllowed(
  redirectUri: string | undefined,
  clientId?: string
): Promise<boolean> {
  // No redirect URI means no redirect (safe)
  if (!redirectUri) {
    return true;
  }

  // Parse as URL to validate format
  try {
    const url = new URL(redirectUri);

    // Security check: Only allow http and https protocols
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      console.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: 'Redirect URI rejected: invalid protocol',
        protocol: url.protocol,
        redirectUri,
        clientId,
      }));
      return false;
    }
  } catch (error) {
    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message: 'Redirect URI rejected: invalid URL format',
      redirectUri,
      clientId,
      error: error instanceof Error ? error.message : 'Unknown error',
    }));
    return false;
  }

  // If client_id is provided, check dynamically registered clients first (DCR flow)
  if (clientId) {
    const isDcrValid = await clientRegistrationManager.validateRedirectUri(clientId, redirectUri);

    if (isDcrValid) {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Redirect URI validated via Dynamic Client Registration',
        clientId,
        redirectUri,
      }));
      return true;
    }

    // Log that DCR validation failed but continue to static whitelist check
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'debug',
      message: 'Redirect URI not found in DCR client registration, checking static whitelist',
      clientId,
      redirectUri,
    }));
  }

  // Check against static whitelist (fallback for non-DCR clients or when DCR validation fails)
  const allowedUris = getAllowedRedirectUris();
  const isAllowed = allowedUris.some(pattern => uriMatchesPattern(redirectUri, pattern));

  if (!isAllowed) {
    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message: 'Redirect URI rejected: not in static whitelist and not registered via DCR',
      redirectUri,
      clientId,
      allowedUris,
    }));
  } else {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Redirect URI validated via static whitelist',
      redirectUri,
      clientId,
    }));
  }

  return isAllowed;
}

/**
 * Validate a redirect URI and throw an error if invalid
 *
 * @param redirectUri - The redirect URI to validate
 * @param clientId - Optional client ID for DCR clients
 * @throws Error if the URI is not allowed
 */
export async function validateRedirectUri(
  redirectUri: string | undefined,
  clientId?: string
): Promise<void> {
  if (!(await isRedirectUriAllowed(redirectUri, clientId))) {
    throw new Error(
      `Redirect URI not allowed: ${redirectUri}. ` +
      `Only whitelisted redirect URIs are permitted for security.`
    );
  }
}

/**
 * Log the current redirect URI whitelist (for debugging/startup)
 */
export function logRedirectUriWhitelist(): void {
  const allowedUris = getAllowedRedirectUris();

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'OAuth redirect URI whitelist configured',
    count: allowedUris.length,
    allowedUris,
    environment: process.env.NODE_ENV || 'development',
  }));
}
