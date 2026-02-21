#!/usr/bin/env node

/**
 * Gmail MCP Server - Entry point
 *
 * This entry point handles OAuth authentication automatically:
 * - If tokens exist, starts the server immediately
 * - If no tokens, opens browser for OAuth and waits for authentication
 */

import * as dotenv from 'dotenv';
import { GmailServer } from './server.js';
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
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://mail.google.com/',
];

/**
 * Performs OAuth authentication with browser popup
 */
async function performOAuth(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  tokenPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    // Parse the redirect URI to get the port
    const redirectUrl = new URL(redirectUri);
    const port = parseInt(redirectUrl.port) || 3000;

    // Create a temporary HTTP server to receive the OAuth callback
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url || '', `http://localhost:${port}`);

        if (url.pathname === '/oauth/callback' || url.pathname === '/oauth2callback') {
          const code = url.searchParams.get('code');
          const error = url.searchParams.get('error');

          if (error) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
                  <div style="text-align: center;">
                    <h1 style="color: #dc3545;">Authentication Failed</h1>
                    <p>Error: ${error}</p>
                    <p>You can close this window.</p>
                  </div>
                </body>
              </html>
            `);
            server.close();
            reject(new Error(`OAuth error: ${error}`));
            return;
          }

          if (!code) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
                  <div style="text-align: center;">
                    <h1 style="color: #dc3545;">Authentication Failed</h1>
                    <p>No authorization code received.</p>
                    <p>You can close this window.</p>
                  </div>
                </body>
              </html>
            `);
            server.close();
            reject(new Error('No authorization code received'));
            return;
          }

          // Exchange code for tokens
          const { tokens } = await oauth2Client.getToken(code);
          oauth2Client.setCredentials(tokens);

          // Save tokens
          await fs.writeFile(tokenPath, JSON.stringify(tokens, null, 2));

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                <div style="text-align: center; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
                  <div style="font-size: 64px; margin-bottom: 20px;">✅</div>
                  <h1 style="color: #28a745; margin: 0 0 10px 0;">Authentication Successful!</h1>
                  <p style="color: #666; margin: 0;">Gmail MCP Server is now connected.</p>
                  <p style="color: #999; margin-top: 20px; font-size: 14px;">You can close this window and return to MCP Inspector.</p>
                </div>
              </body>
            </html>
          `);

          server.close();
          resolve();
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found');
        }
      } catch (err) {
        console.error('OAuth callback error:', err);
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
              <div style="text-align: center;">
                <h1 style="color: #dc3545;">Authentication Error</h1>
                <p>${err instanceof Error ? err.message : 'Unknown error'}</p>
                <p>You can close this window.</p>
              </div>
            </body>
          </html>
        `);
        server.close();
        reject(err);
      }
    });

    server.listen(port, () => {
      // Generate auth URL
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent', // Force consent to get refresh token
      });

      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Opening browser for Google authentication...',
      }));

      // Open browser automatically
      open(authUrl).catch(() => {
        // If open fails, show URL for manual opening
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'warn',
          message: 'Could not open browser automatically. Please visit this URL:',
          url: authUrl,
        }));
      });
    });

    server.on('error', (err) => {
      reject(err);
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('OAuth timeout - no response received within 5 minutes'));
    }, 5 * 60 * 1000);
  });
}

/**
 * Check if tokens exist and are valid
 */
async function checkTokens(tokenPath: string): Promise<boolean> {
  try {
    const tokenData = await fs.readFile(tokenPath, 'utf-8');
    const tokens = JSON.parse(tokenData);
    return !!(tokens.access_token && tokens.refresh_token);
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth/callback';
  const tokenPath = process.env.TOKEN_PATH || join(__dirname, '../token.json');

  if (!clientId || !clientSecret) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Missing required environment variables: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET',
    }));
    console.error('\nPlease create a .env file with:');
    console.error('  GOOGLE_CLIENT_ID=...');
    console.error('  GOOGLE_CLIENT_SECRET=...');
    console.error('  GOOGLE_REDIRECT_URI=... (optional, defaults to http://localhost:3000/oauth/callback)');
    console.error('\nSee .env.example for reference.');
    process.exit(1);
  }

  try {
    // Check if we need to authenticate
    const hasTokens = await checkTokens(tokenPath);

    if (!hasTokens) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'No OAuth tokens found. Starting authentication flow...',
      }));

      await performOAuth(clientId, clientSecret, redirectUri, tokenPath);

      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'OAuth authentication completed successfully',
      }));
    }

    // Start the server
    const server = new GmailServer(clientId, clientSecret, redirectUri, tokenPath);
    await server.initialize();
    await server.start();

    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Gmail MCP Server started successfully',
    }));
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Failed to start Gmail MCP server',
      error: error instanceof Error ? error.message : String(error),
    }));
    process.exit(1);
  }
}

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Shutting down Gmail MCP server...',
  }));
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Shutting down Gmail MCP server...',
  }));
  process.exit(0);
});

main();
