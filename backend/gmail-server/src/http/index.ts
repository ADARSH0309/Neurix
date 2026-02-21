#!/usr/bin/env node

/**
 * Gmail MCP Server - HTTP Entry Point
 *
 * Starts the Gmail MCP server with HTTP transport for web integrations.
 */

import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { startHttpServer } from './server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

const PORT = parseInt(process.env.PORT || '8082', 10);

// Validate required environment variables
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'error',
    message: 'Missing required environment variables: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET',
  }));
  process.exit(1);
}

const redirectUri = process.env.GOOGLE_REDIRECT_URI || `http://localhost:${PORT}/oauth/callback`;
const tokenPath = process.env.TOKEN_PATH || join(__dirname, '../../token.json');

// Start the server
startHttpServer({ clientId, clientSecret, redirectUri, tokenPath }, PORT);

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\nShutting down Gmail MCP Server (HTTP)...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down Gmail MCP Server (HTTP)...');
  process.exit(0);
});
