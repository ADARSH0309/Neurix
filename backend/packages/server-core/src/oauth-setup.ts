#!/usr/bin/env node

/**
 * OAuth setup script for Google Drive
 * Run this to manually authenticate and get tokens
 */

import { google } from 'googleapis';
import * as readline from 'readline';
import fs from 'fs/promises';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import http from 'http';
import open from 'open';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
];

async function getNewTokenWithServer(oauth2Client: any, tokenPath: string, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url || '', `http://localhost:${port}`);

        if (url.pathname === '/oauth/callback' || url.pathname === '/oauth2callback') {
          const code = url.searchParams.get('code');
          const error = url.searchParams.get('error');

          if (error) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(`<html><body><h1>Error: ${error}</h1><p>You can close this window.</p></body></html>`);
            server.close();
            reject(new Error(`OAuth error: ${error}`));
            return;
          }

          if (!code) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end('<html><body><h1>Error: No code received</h1></body></html>');
            server.close();
            reject(new Error('No authorization code received'));
            return;
          }

          const { tokens } = await oauth2Client.getToken(code);
          oauth2Client.setCredentials(tokens);
          await fs.writeFile(tokenPath, JSON.stringify(tokens, null, 2));

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5;">
                <div style="text-align: center; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                  <h1 style="color: #28a745;">✅ Authentication Successful!</h1>
                  <p>Token stored at: ${tokenPath}</p>
                  <p>You can close this window and return to the terminal.</p>
                </div>
              </body>
            </html>
          `);

          console.log('\n✅ Token stored successfully to', tokenPath);
          console.log('✅ You can now run the Google Drive MCP server!\n');

          server.close();
          resolve();
        } else {
          res.writeHead(404);
          res.end('Not found');
        }
      } catch (err) {
        res.writeHead(500);
        res.end('Server error');
        server.close();
        reject(err);
      }
    });

    server.listen(port, async () => {
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent',
      });

      console.log('\n===========================================');
      console.log('Google Drive OAuth Setup');
      console.log('===========================================\n');
      console.log('Opening browser for authentication...\n');

      try {
        await open(authUrl);
        console.log('If the browser did not open, visit this URL:\n');
        console.log(authUrl);
      } catch {
        console.log('Could not open browser. Please visit this URL:\n');
        console.log(authUrl);
      }
    });

    server.on('error', reject);
  });
}

async function getNewTokenManual(oauth2Client: any, tokenPath: string) {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  console.log('\n===========================================');
  console.log('Google Drive OAuth Setup (Manual)');
  console.log('===========================================\n');
  console.log('1. Authorize this app by visiting this URL:\n');
  console.log(authUrl);
  console.log('\n2. After authorization, you will get a code.');
  console.log('3. Enter that code here:\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    rl.question('Enter the authorization code: ', async (code) => {
      rl.close();

      try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        await fs.writeFile(tokenPath, JSON.stringify(tokens, null, 2));
        console.log('\n✅ Token stored successfully to', tokenPath);
        console.log('✅ You can now run the Google Drive MCP server!\n');
        resolve(tokens);
      } catch (error) {
        console.error('\n❌ Error retrieving access token:', error);
        reject(error);
      }
    });
  });
}

async function main() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth/callback';
  const tokenPath = process.env.TOKEN_PATH || join(__dirname, '../token.json');

  if (!clientId || !clientSecret) {
    console.error('❌ Missing required environment variables.');
    console.error('\nPlease create a .env file with:');
    console.error('  GOOGLE_CLIENT_ID=...');
    console.error('  GOOGLE_CLIENT_SECRET=...');
    console.error('  GOOGLE_REDIRECT_URI=... (optional)');
    console.error('\nSee .env.example for reference.');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  // Check if token already exists
  try {
    const tokenData = await fs.readFile(tokenPath, 'utf-8');
    const tokens = JSON.parse(tokenData);
    if (tokens.access_token && tokens.refresh_token) {
      console.log('✅ Token already exists at', tokenPath);
      console.log('\nTo re-authenticate, delete this file and run the setup again.');
      process.exit(0);
    }
  } catch {
    // Token doesn't exist or is invalid, continue with setup
  }

  // Parse redirect URI to get port
  const redirectUrl = new URL(redirectUri);
  const port = parseInt(redirectUrl.port) || 3000;

  // Check if redirect URI is localhost (can use automatic server)
  if (redirectUrl.hostname === 'localhost' || redirectUrl.hostname === '127.0.0.1') {
    try {
      await getNewTokenWithServer(oauth2Client, tokenPath, port);
    } catch (error) {
      console.log('\nAutomatic authentication failed, falling back to manual mode...\n');
      await getNewTokenManual(oauth2Client, tokenPath);
    }
  } else {
    // Non-localhost redirect, must use manual mode
    await getNewTokenManual(oauth2Client, tokenPath);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
