/**
 * OAuth setup script for Google Sheets MCP Server
 * Run: node dist/oauth-setup.js
 */

import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { google } from 'googleapis';
import http from 'http';
import open from 'open';
import fs from 'fs/promises';
import * as readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
];

async function main() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8085/auth/g-sheets/callback';
  const tokenPath = process.env.TOKEN_PATH || join(__dirname, '../token.json');

  if (!clientId || !clientSecret) {
    console.error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  console.log('\n=== Google Sheets OAuth Setup ===\n');
  console.log('Opening browser for authentication...\n');

  // Try automatic flow first
  const redirectUrl = new URL(redirectUri);
  const port = parseInt(redirectUrl.port) || 8085;

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '', `http://localhost:${port}`);
    const code = url.searchParams.get('code');

    if (code) {
      try {
        const { tokens } = await oauth2Client.getToken(code);
        await fs.writeFile(tokenPath, JSON.stringify(tokens, null, 2));
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body style="font-family:system-ui;text-align:center;padding:50px"><h1 style="color:#059669">✅ Setup Complete!</h1><p>You can close this window.</p></body></html>');
        console.log(`\n✅ Tokens saved to ${tokenPath}`);
        server.close();
        process.exit(0);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Token exchange failed');
        console.error('Token exchange error:', err);
        server.close();
        process.exit(1);
      }
    }
  });

  server.listen(port, () => {
    open(authUrl).catch(() => {
      console.log('Could not open browser. Visit this URL:\n');
      console.log(authUrl);
      console.log('\nThen paste the authorization code below:\n');

      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl.question('Code: ', async (code) => {
        try {
          const { tokens } = await oauth2Client.getToken(code.trim());
          await fs.writeFile(tokenPath, JSON.stringify(tokens, null, 2));
          console.log(`\n✅ Tokens saved to ${tokenPath}`);
        } catch (err) {
          console.error('Token exchange error:', err);
        }
        rl.close();
        server.close();
        process.exit(0);
      });
    });
  });

  setTimeout(() => {
    console.error('\n⏰ OAuth setup timed out after 5 minutes');
    server.close();
    process.exit(1);
  }, 5 * 60 * 1000);
}

main();
