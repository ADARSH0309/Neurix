#!/usr/bin/env node

/**
 * Gmail MCP Server - HTTP Entry Point
 *
 * Starts the Gmail MCP server with HTTP transport for web integrations.
 */

import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import fs from 'fs/promises';
import { google } from 'googleapis';
import open from 'open';
import { GmailClient } from '../gmail-client.js';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

const PORT = parseInt(process.env.PORT || '8082', 10);

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://mail.google.com/',
];

// JSON-RPC request schema
const JsonRpcRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  method: z.string(),
  params: z.record(z.unknown()).optional(),
});

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

async function createHttpServer(): Promise<Express> {
  const app = express();

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `http://localhost:${PORT}/oauth/callback`;
  const tokenPath = process.env.TOKEN_PATH || join(__dirname, '../../token.json');

  // Store the frontend redirect URI across the OAuth flow
  let pendingRedirectUri: string | null = null;

  if (!clientId || !clientSecret) {
    throw new Error('Missing required environment variables: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
  }

  // Initialize Gmail client
  const gmailClient = new GmailClient(clientId, clientSecret, redirectUri, tokenPath);

  // Check if already authenticated
  let isAuthenticated = false;
  try {
    await gmailClient.initialize();
    isAuthenticated = true;
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Gmail client initialized with existing tokens',
    }));
  } catch {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message: 'No existing tokens found. OAuth required.',
    }));
  }

  // Middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Disable for API server
  }));

  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  }));

  app.use(cookieParser());
  app.use(express.json());

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: { error: 'Too many requests, please try again later' },
  });
  app.use(limiter);

  // Request logging
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      method: req.method,
      path: req.path,
    }));
    next();
  });

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      service: 'gmail-mcp-server',
      version: '0.1.0',
      authenticated: isAuthenticated,
    });
  });

  // OAuth routes
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  app.get('/auth/login', (req: Request, res: Response) => {
    const frontendRedirect = req.query.redirect_uri as string | undefined;
    if (frontendRedirect) {
      pendingRedirectUri = frontendRedirect;
    }

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
    });
    res.redirect(authUrl);
  });

  // Support multiple callback paths
  app.get(['/oauth/callback', '/auth/gmail/callback', '/auth/g-mail/callback', '/oauth2callback'], async (req: Request, res: Response) => {
    const code = req.query.code as string;
    const error = req.query.error as string;

    if (error) {
      res.status(400).send(`
        <html>
          <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
            <div style="text-align: center;">
              <h1 style="color: #dc3545;">Authentication Failed</h1>
              <p>Error: ${error}</p>
            </div>
          </body>
        </html>
      `);
      return;
    }

    if (!code) {
      res.status(400).send('No authorization code received');
      return;
    }

    try {
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
      await fs.writeFile(tokenPath, JSON.stringify(tokens, null, 2));

      // Reinitialize client with new tokens
      await gmailClient.initialize();
      isAuthenticated = true;

      // Redirect back to the frontend if a redirect URI was provided
      if (pendingRedirectUri) {
        const redirectTarget = pendingRedirectUri;
        pendingRedirectUri = null;
        const separator = redirectTarget.includes('?') ? '&' : '?';
        res.redirect(`${redirectTarget}${separator}access_token=${encodeURIComponent(tokens.access_token || '')}&server=gmail`);
        return;
      }

      res.send(`
        <html>
          <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <div style="text-align: center; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
              <div style="font-size: 64px; margin-bottom: 20px;">✅</div>
              <h1 style="color: #28a745; margin: 0 0 10px 0;">Authentication Successful!</h1>
              <p style="color: #666; margin: 0;">Gmail MCP Server is now connected.</p>
              <p style="color: #999; margin-top: 20px; font-size: 14px;">You can close this window.</p>
            </div>
          </body>
        </html>
      `);
    } catch (err) {
      console.error('OAuth callback error:', err);
      res.status(500).send('Authentication failed');
    }
  });

  // MCP JSON-RPC endpoint
  app.post('/', async (req: Request, res: Response) => {
    if (!isAuthenticated) {
      const response: JsonRpcResponse = {
        jsonrpc: '2.0',
        id: req.body?.id || 0,
        error: {
          code: -32001,
          message: 'Not authenticated. Please visit /auth/login first.',
        },
      };
      res.status(401).json(response);
      return;
    }

    try {
      const request = JsonRpcRequestSchema.parse(req.body);
      const { id, method, params } = request;

      let result: unknown;

      switch (method) {
        case 'initialize':
          result = {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
              resources: {},
              prompts: {},
            },
            serverInfo: {
              name: 'neurix-gmail-server',
              version: '0.1.0',
            },
          };
          break;

        case 'tools/list':
          result = {
            tools: await getToolsList(),
          };
          break;

        case 'tools/call':
          result = await handleToolCall(gmailClient, params as { name: string; arguments: Record<string, unknown> });
          break;

        case 'resources/list':
          result = {
            resources: [
              { uri: 'gmail://inbox', name: 'Inbox', mimeType: 'application/json' },
              { uri: 'gmail://sent', name: 'Sent', mimeType: 'application/json' },
              { uri: 'gmail://labels', name: 'Labels', mimeType: 'application/json' },
            ],
          };
          break;

        default:
          throw new Error(`Unknown method: ${method}`);
      }

      const response: JsonRpcResponse = {
        jsonrpc: '2.0',
        id,
        result,
      };
      res.json(response);
    } catch (error) {
      const response: JsonRpcResponse = {
        jsonrpc: '2.0',
        id: req.body?.id || 0,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error',
        },
      };
      res.status(500).json(response);
    }
  });

  // Serve test page
  app.use(express.static(join(__dirname, 'public')));

  return app;
}

async function getToolsList(): Promise<unknown[]> {
  return [
    {
      name: 'list_messages',
      description: 'List messages in the mailbox',
      inputSchema: {
        type: 'object',
        properties: {
          maxResults: { type: 'number' },
          query: { type: 'string' },
        },
      },
    },
    {
      name: 'get_message',
      description: 'Get a specific message',
      inputSchema: {
        type: 'object',
        properties: {
          messageId: { type: 'string' },
        },
        required: ['messageId'],
      },
    },
    {
      name: 'send_message',
      description: 'Send an email',
      inputSchema: {
        type: 'object',
        properties: {
          to: { type: 'string' },
          subject: { type: 'string' },
          body: { type: 'string' },
        },
        required: ['to', 'subject', 'body'],
      },
    },
    {
      name: 'search_messages',
      description: 'Search messages',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          maxResults: { type: 'number' },
        },
        required: ['query'],
      },
    },
    {
      name: 'get_profile',
      description: 'Get Gmail profile',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'list_labels',
      description: 'List all labels',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
  ];
}

async function handleToolCall(
  gmailClient: GmailClient,
  params: { name: string; arguments: Record<string, unknown> }
): Promise<unknown> {
  const { name, arguments: args } = params;

  switch (name) {
    case 'list_messages': {
      const result = await gmailClient.listMessages({
        maxResults: (args.maxResults as number) || 20,
        q: args.query as string,
      });

      // Fetch full details for each message
      const messagesWithDetails = await Promise.all(
        (result.messages || []).map(async (msg: { id?: string }) => {
          if (!msg.id) return null;
          try {
            const fullMessage = await gmailClient.getMessage(msg.id);
            return gmailClient.parseMessage(fullMessage);
          } catch {
            return null;
          }
        })
      );

      const validMessages = messagesWithDetails.filter(m => m !== null);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(validMessages, null, 2),
        }],
      };
    }

    case 'get_message': {
      const message = await gmailClient.getMessage(args.messageId as string);
      const parsed = gmailClient.parseMessage(message);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(parsed, null, 2),
        }],
      };
    }

    case 'send_message': {
      const result = await gmailClient.sendMessage({
        to: args.to as string,
        subject: args.subject as string,
        body: args.body as string,
      });
      return {
        content: [{
          type: 'text',
          text: `Email sent! Message ID: ${result.id}`,
        }],
      };
    }

    case 'search_messages': {
      const messages = await gmailClient.searchMessages(
        args.query as string,
        (args.maxResults as number) || 20
      );

      // Fetch full details for each message
      const messagesWithDetails = await Promise.all(
        (messages || []).map(async (msg: { id?: string }) => {
          if (!msg.id) return null;
          try {
            const fullMessage = await gmailClient.getMessage(msg.id);
            return gmailClient.parseMessage(fullMessage);
          } catch {
            return null;
          }
        })
      );

      const validMessages = messagesWithDetails.filter(m => m !== null);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(validMessages, null, 2),
        }],
      };
    }

    case 'get_profile': {
      const profile = await gmailClient.getProfile();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(profile, null, 2),
        }],
      };
    }

    case 'list_labels': {
      const labels = await gmailClient.listLabels();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(labels, null, 2),
        }],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function main(): Promise<void> {
  try {
    const app = await createHttpServer();

    app.listen(PORT, () => {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Gmail MCP Server (HTTP) listening on port ${PORT}`,
      }));
      console.log(`\nServer running at http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`OAuth login: http://localhost:${PORT}/auth/login`);
      console.log(`Test page: http://localhost:${PORT}/test.html`);
    });
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Failed to start HTTP server',
      error: error instanceof Error ? error.message : String(error),
    }));
    process.exit(1);
  }
}

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\nShutting down Gmail MCP Server (HTTP)...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down Gmail MCP Server (HTTP)...');
  process.exit(0);
});

main();
