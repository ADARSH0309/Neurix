/**
 * OAuth Redirect URI Validator
 */

import { clientRegistrationManager } from './client-registration.js';

const DEFAULT_ALLOWED_URIS = [
  'https://inspector.modelcontextprotocol.io/callback',
  'http://localhost:5173',
  'http://localhost:5173/callback',
  'http://localhost:5173/oauth/callback',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5173/callback',
  'http://127.0.0.1:5173/oauth/callback',
  'http://localhost:3001',
  'http://localhost:3001/oauth/callback',
  'http://localhost:3004',
  'http://localhost:3004/oauth/callback',
  'http://localhost:6274',
  'http://localhost:6274/oauth/callback',
  'http://localhost:3000',
  'http://localhost:3000/',
  'http://localhost:3000/test',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3000/',
  'http://127.0.0.1:3000/test',
];

const PRODUCTION_ALLOWED_URIS = [
  'https://gdrive-mcp.daffyos.in/test',
  'https://gdrive-agent-dev.daffyos.in',
  'https://gdrive-agent-dev.daffyos.in/callback',
  'https://gdrive-agent-dev.daffyos.in/oauth/callback',
  'https://gdrive-agent-dev.daffyos.in/test',
];

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

  if (process.env.NODE_ENV === 'production') {
    allowedUris.push(...PRODUCTION_ALLOWED_URIS);
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

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'debug',
      message: 'Redirect URI not found in DCR client registration, checking static whitelist',
      clientId,
      redirectUri,
    }));
  }

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
