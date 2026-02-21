#!/usr/bin/env node

/**
 * Google Calendar MCP Server - Entry point
 *
 * Handles OAuth authentication automatically:
 * - If tokens exist, starts the server immediately
 * - If no tokens, opens browser for OAuth and waits for authentication
 */

import * as dotenv from 'dotenv';
import { GCalendarServer } from './server.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import { google } from 'googleapis';
import http from 'http';
import open from 'open';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.settings.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
];

async function performOAuth(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  tokenPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    const redirectUrl = new URL(redirectUri);
    const port = parseInt(redirectUrl.port) || 3000;

    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url || '', `http://localhost:${port}`);
        const pathsToMatch = [
          '/oauth/callback',
          '/oauth2callback',
          '/auth/g-calender/callback',
          '/auth/callback',
        ];

        if (pathsToMatch.includes(url.pathname)) {
          const code = url.searchParams.get('code');
          const error = url.searchParams.get('error');

          if (error) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(`<html><body style="font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0"><div style="text-align:center"><h1 style="color:#dc3545">Authentication Failed</h1><p>Error: ${error}</p><p>You can close this window.</p></div></body></html>`);
            server.close();
            reject(new Error(`OAuth error: ${error}`));
            return;
          }

          if (!code) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(`<html><body style="font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0"><div style="text-align:center"><h1 style="color:#dc3545">Authentication Failed</h1><p>No authorization code received.</p></div></body></html>`);
            server.close();
            reject(new Error('No authorization code received'));
            return;
          }

          const { tokens } = await oauth2Client.getToken(code);
          oauth2Client.setCredentials(tokens);
          await fs.writeFile(tokenPath, JSON.stringify(tokens, null, 2));

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`<html><body style="font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%)"><div style="text-align:center;background:white;padding:40px;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,0.2)"><div style="font-size:64px;margin-bottom:20px">✅</div><h1 style="color:#28a745;margin:0 0 10px 0">Authentication Successful!</h1><p style="color:#666;margin:0">Google Calendar MCP Server is now connected.</p><p style="color:#999;margin-top:20px;font-size:14px">You can close this window.</p></div></body></html>`);
          server.close();
          resolve();
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found');
        }
      } catch (err) {
        console.error('OAuth callback error:', err);
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`<html><body style="font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0"><div style="text-align:center"><h1 style="color:#dc3545">Authentication Error</h1><p>${err instanceof Error ? err.message : 'Unknown error'}</p></div></body></html>`);
        server.close();
        reject(err);
      }
    });

    server.listen(port, () => {
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent',
      });

      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Opening browser for Google Calendar authentication...',
      }));

      open(authUrl).catch(() => {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'warn',
          message: 'Could not open browser automatically. Please visit this URL:',
          url: authUrl,
        }));
      });
    });

    server.on('error', reject);

    setTimeout(() => {
      server.close();
      reject(new Error('OAuth timeout - no response received within 5 minutes'));
    }, 5 * 60 * 1000);
  });
}

async function checkTokens(tokenPath: string): Promise<boolean> {
  try {
    const tokenData = await fs.readFile(tokenPath, 'utf-8');
    const tokens = JSON.parse(tokenData);
    return !!(tokens.access_token && tokens.refresh_token);
  } catch {
    return false;
  }
}

async function main() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8083/auth/g-calender/callback';
  const tokenPath = process.env.TOKEN_PATH || join(__dirname, '../token.json');

  if (!clientId || !clientSecret) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Missing required environment variables: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET',
    }));
    process.exit(1);
  }

  try {
    const hasTokens = await checkTokens(tokenPath);

    if (!hasTokens) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'No OAuth tokens found. Starting authentication flow...',
      }));
      await performOAuth(clientId, clientSecret, redirectUri, tokenPath);
    }

    const server = new GCalendarServer(clientId, clientSecret, redirectUri, tokenPath);
    await server.initialize();
    await server.run();

    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Google Calendar MCP Server started successfully',
    }));
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Failed to start Google Calendar MCP server',
      error: error instanceof Error ? error.message : String(error),
    }));
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Shutting down Google Calendar MCP server...',
  }));
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Shutting down Google Calendar MCP server...',
  }));
  process.exit(0);
});

main();
