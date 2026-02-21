#!/usr/bin/env node

/**
 * Non-interactive OAuth token exchange
 * Usage: node dist/exchange-token.js <authorization-code>
 */

import { google } from 'googleapis';
import fs from 'fs/promises';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

async function exchangeToken(authorizationCode: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  const tokenPath = process.env.TOKEN_PATH || './token.json';

  if (!clientId || !clientSecret || !redirectUri) {
    console.error('Missing required environment variables.');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  try {
    console.log('Exchanging authorization code for tokens...');
    const { tokens } = await oauth2Client.getToken(authorizationCode);

    // Save the token
    await fs.writeFile(tokenPath, JSON.stringify(tokens, null, 2));

    console.log('\nToken stored successfully to', tokenPath);
    console.log('OAuth authentication complete!');
    console.log('You can now run the Google Calendar MCP server!\n');

    process.exit(0);
  } catch (error) {
    console.error('\nError exchanging authorization code:', error);
    console.error('\nThe authorization code may have expired. Please run oauth-setup again.');
    process.exit(1);
  }
}

const authCode = process.argv[2];
if (!authCode) {
  console.error('Usage: node dist/exchange-token.js <authorization-code>');
  process.exit(1);
}

exchangeToken(authCode);
