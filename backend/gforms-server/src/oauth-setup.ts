#!/usr/bin/env node

/**
 * OAuth setup script for Google Forms
 * Run this once to authenticate and get tokens
 */

import { google } from 'googleapis';
import * as readline from 'readline';
import fs from 'fs/promises';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const SCOPES = [
  'https://www.googleapis.com/auth/forms.body',           // Full read/write access to forms
  'https://www.googleapis.com/auth/forms.responses.readonly', // Read responses
  'https://www.googleapis.com/auth/drive.file',           // Create/access files created by this app
  'https://www.googleapis.com/auth/userinfo.email',
];

async function getNewToken(oauth2Client: any, tokenPath: string) {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('\n===========================================');
  console.log('Google Forms OAuth Setup');
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

        // Save the token
        await fs.writeFile(tokenPath, JSON.stringify(tokens, null, 2));
        console.log('\n✅ Token stored successfully to', tokenPath);
        console.log('✅ You can now run the Google Forms MCP server!\n');
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
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  const tokenPath = process.env.TOKEN_PATH || './token.json';

  if (!clientId || !clientSecret || !redirectUri) {
    console.error('❌ Missing required environment variables.');
    console.error('\nPlease create a .env file with:');
    console.error('  GOOGLE_CLIENT_ID=...');
    console.error('  GOOGLE_CLIENT_SECRET=...');
    console.error('  GOOGLE_REDIRECT_URI=...');
    console.error('\nSee .env.example for reference.');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  // Check if token already exists
  try {
    const tokenData = await fs.readFile(tokenPath, 'utf-8');
    console.log('✅ Token already exists at', tokenPath);
    console.log('\nTo re-authenticate, delete this file and run the setup again.');
    process.exit(0);
  } catch {
    // Token doesn't exist, get a new one
    await getNewToken(oauth2Client, tokenPath);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
