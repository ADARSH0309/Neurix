/**
 * OAuth Redirect URI Validator
 *
 * Only allows URIs that are actually registered in Google Cloud Console
 * plus MCP Inspector and any production URIs from ALLOWED_REDIRECT_URIS env var.
 */

import { clientRegistrationManager } from './client-registration.js';

/**
 * Minimal default whitelist. The real callback URI for each service is
 * computed at runtime from GOOGLE_REDIRECT_URI env var and added automatically.
 */
const DEFAULT_ALLOWED_URIS = [
  'https://inspector.modelcontextprotocol.io/callback',
  'http://localhost:9000',
];

/**
 * Parse additional allowed redirect URIs from environment variable.
 * Set ALLOWED_REDIRECT_URIS to a comma-separated list of production URIs.
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

export function getAllowedRedirectUris(): string[] {
  const allowedUris = [...DEFAULT_ALLOWED_URIS];

  // Add the server's own callback URI from env
  const ownCallback = process.env.GOOGLE_REDIRECT_URI;
  if (ownCallback) {
    allowedUris.push(ownCallback);
  }

  allowedUris.push(...getAdditionalAllowedUris());
  return allowedUris;
}

function uriMatchesPattern(uri: string, pattern: string): boolean {
  return uri === pattern;
}

export async function isRedirectUriAllowed(
  redirectUri: string | undefined,
  clientId?: string
): Promise<boolean> {
  if (!redirectUri) {
    return true;
  }

  try {
    const url = new URL(redirectUri);

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
  }

  const allowedUris = getAllowedRedirectUris();
  const isAllowed = allowedUris.some(pattern => uriMatchesPattern(redirectUri, pattern));

  if (!isAllowed) {
    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message: 'Redirect URI rejected: not in whitelist and not registered via DCR',
      redirectUri,
      clientId,
      allowedUris,
    }));
  }

  return isAllowed;
}

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
