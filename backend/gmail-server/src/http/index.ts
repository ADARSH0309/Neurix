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
    // ── Message operations ──
    {
      name: 'list_messages',
      description: 'List messages in the mailbox. Can filter by labels and search query.',
      inputSchema: {
        type: 'object',
        properties: {
          maxResults: { type: 'number', description: 'Maximum number of messages to return (1-100, default: 20)' },
          query: { type: 'string', description: 'Gmail search query (e.g., "from:user@example.com", "is:unread")' },
        },
      },
    },
    {
      name: 'get_message',
      description: 'Get a specific email message with full details',
      inputSchema: {
        type: 'object',
        properties: {
          messageId: { type: 'string', description: 'Message ID' },
        },
        required: ['messageId'],
      },
    },
    {
      name: 'send_message',
      description: 'Send a new email message',
      inputSchema: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Recipient email address' },
          subject: { type: 'string', description: 'Email subject' },
          body: { type: 'string', description: 'Email body content' },
          cc: { type: 'string', description: 'CC recipients (comma-separated)' },
          bcc: { type: 'string', description: 'BCC recipients (comma-separated)' },
        },
        required: ['to', 'subject', 'body'],
      },
    },
    {
      name: 'reply_to_message',
      description: 'Reply to an existing email message',
      inputSchema: {
        type: 'object',
        properties: {
          messageId: { type: 'string', description: 'Message ID to reply to' },
          body: { type: 'string', description: 'Reply body content' },
        },
        required: ['messageId', 'body'],
      },
    },
    {
      name: 'forward_message',
      description: 'Forward an email message to another recipient',
      inputSchema: {
        type: 'object',
        properties: {
          messageId: { type: 'string', description: 'Message ID to forward' },
          to: { type: 'string', description: 'Recipient email address' },
          additionalMessage: { type: 'string', description: 'Additional message to include' },
        },
        required: ['messageId', 'to'],
      },
    },
    {
      name: 'search_messages',
      description: 'Search for messages using Gmail search syntax',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Gmail search query' },
          maxResults: { type: 'number', description: 'Maximum results (default: 20)' },
        },
        required: ['query'],
      },
    },
    {
      name: 'trash_message',
      description: 'Move a message to trash',
      inputSchema: {
        type: 'object',
        properties: {
          messageId: { type: 'string', description: 'Message ID' },
        },
        required: ['messageId'],
      },
    },
    {
      name: 'untrash_message',
      description: 'Remove a message from trash',
      inputSchema: {
        type: 'object',
        properties: {
          messageId: { type: 'string', description: 'Message ID' },
        },
        required: ['messageId'],
      },
    },
    {
      name: 'delete_message',
      description: 'Permanently delete a message (cannot be undone)',
      inputSchema: {
        type: 'object',
        properties: {
          messageId: { type: 'string', description: 'Message ID' },
        },
        required: ['messageId'],
      },
    },
    {
      name: 'mark_as_read',
      description: 'Mark a message as read',
      inputSchema: {
        type: 'object',
        properties: {
          messageId: { type: 'string', description: 'Message ID' },
        },
        required: ['messageId'],
      },
    },
    {
      name: 'mark_as_unread',
      description: 'Mark a message as unread',
      inputSchema: {
        type: 'object',
        properties: {
          messageId: { type: 'string', description: 'Message ID' },
        },
        required: ['messageId'],
      },
    },
    {
      name: 'star_message',
      description: 'Star a message',
      inputSchema: {
        type: 'object',
        properties: {
          messageId: { type: 'string', description: 'Message ID' },
        },
        required: ['messageId'],
      },
    },
    {
      name: 'unstar_message',
      description: 'Remove star from a message',
      inputSchema: {
        type: 'object',
        properties: {
          messageId: { type: 'string', description: 'Message ID' },
        },
        required: ['messageId'],
      },
    },
    {
      name: 'archive_message',
      description: 'Archive a message (remove from inbox)',
      inputSchema: {
        type: 'object',
        properties: {
          messageId: { type: 'string', description: 'Message ID' },
        },
        required: ['messageId'],
      },
    },
    {
      name: 'modify_labels',
      description: 'Add or remove labels from a message',
      inputSchema: {
        type: 'object',
        properties: {
          messageId: { type: 'string', description: 'Message ID' },
          addLabelIds: { type: 'string', description: 'Comma-separated label IDs to add' },
          removeLabelIds: { type: 'string', description: 'Comma-separated label IDs to remove' },
        },
        required: ['messageId'],
      },
    },
    {
      name: 'get_unread',
      description: 'Get unread messages from inbox',
      inputSchema: {
        type: 'object',
        properties: {
          maxResults: { type: 'number', description: 'Maximum results (default: 20)' },
        },
      },
    },
    {
      name: 'get_sent',
      description: 'Get sent messages',
      inputSchema: {
        type: 'object',
        properties: {
          maxResults: { type: 'number', description: 'Maximum results (default: 20)' },
        },
      },
    },
    {
      name: 'get_starred',
      description: 'Get starred messages',
      inputSchema: {
        type: 'object',
        properties: {
          maxResults: { type: 'number', description: 'Maximum results (default: 20)' },
        },
      },
    },
    {
      name: 'get_trashed',
      description: 'Get messages in trash',
      inputSchema: {
        type: 'object',
        properties: {
          maxResults: { type: 'number', description: 'Maximum results (default: 20)' },
        },
      },
    },
    // ── Thread operations ──
    {
      name: 'list_threads',
      description: 'List email threads',
      inputSchema: {
        type: 'object',
        properties: {
          maxResults: { type: 'number', description: 'Maximum threads to return (default: 20)' },
          query: { type: 'string', description: 'Gmail search query' },
        },
      },
    },
    {
      name: 'get_thread',
      description: 'Get a thread with all its messages',
      inputSchema: {
        type: 'object',
        properties: {
          threadId: { type: 'string', description: 'Thread ID' },
        },
        required: ['threadId'],
      },
    },
    {
      name: 'trash_thread',
      description: 'Move an entire thread to trash',
      inputSchema: {
        type: 'object',
        properties: {
          threadId: { type: 'string', description: 'Thread ID' },
        },
        required: ['threadId'],
      },
    },
    {
      name: 'delete_thread',
      description: 'Permanently delete a thread (cannot be undone)',
      inputSchema: {
        type: 'object',
        properties: {
          threadId: { type: 'string', description: 'Thread ID' },
        },
        required: ['threadId'],
      },
    },
    // ── Label operations ──
    {
      name: 'list_labels',
      description: 'List all labels in the mailbox',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'create_label',
      description: 'Create a new label',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Label name' },
        },
        required: ['name'],
      },
    },
    {
      name: 'update_label',
      description: 'Update a label',
      inputSchema: {
        type: 'object',
        properties: {
          labelId: { type: 'string', description: 'Label ID' },
          name: { type: 'string', description: 'New label name' },
        },
        required: ['labelId'],
      },
    },
    {
      name: 'delete_label',
      description: 'Delete a label',
      inputSchema: {
        type: 'object',
        properties: {
          labelId: { type: 'string', description: 'Label ID' },
        },
        required: ['labelId'],
      },
    },
    // ── Draft operations ──
    {
      name: 'list_drafts',
      description: 'List all drafts',
      inputSchema: {
        type: 'object',
        properties: {
          maxResults: { type: 'number', description: 'Maximum drafts to return (default: 20)' },
        },
      },
    },
    {
      name: 'create_draft',
      description: 'Create a new draft email',
      inputSchema: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Recipient email address' },
          subject: { type: 'string', description: 'Email subject' },
          body: { type: 'string', description: 'Email body content' },
          cc: { type: 'string', description: 'CC recipients' },
          bcc: { type: 'string', description: 'BCC recipients' },
        },
        required: ['to', 'subject', 'body'],
      },
    },
    {
      name: 'delete_draft',
      description: 'Delete a draft',
      inputSchema: {
        type: 'object',
        properties: {
          draftId: { type: 'string', description: 'Draft ID' },
        },
        required: ['draftId'],
      },
    },
    {
      name: 'send_draft',
      description: 'Send a draft',
      inputSchema: {
        type: 'object',
        properties: {
          draftId: { type: 'string', description: 'Draft ID' },
        },
        required: ['draftId'],
      },
    },
    // ── Attachment operations ──
    {
      name: 'get_attachment',
      description: 'Download an attachment from a message',
      inputSchema: {
        type: 'object',
        properties: {
          messageId: { type: 'string', description: 'Message ID' },
          attachmentId: { type: 'string', description: 'Attachment ID' },
        },
        required: ['messageId', 'attachmentId'],
      },
    },
    // ── Profile ──
    {
      name: 'get_profile',
      description: 'Get Gmail account profile information',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
  ];
}

// Helper: Fetch full parsed details for a list of message stubs
async function fetchMessageDetails(
  gmailClient: GmailClient,
  messages: Array<{ id?: string }>
): Promise<unknown[]> {
  const details = await Promise.all(
    messages.map(async (msg) => {
      if (!msg.id) return null;
      try {
        const fullMessage = await gmailClient.getMessage(msg.id);
        return gmailClient.parseMessage(fullMessage);
      } catch {
        return null;
      }
    })
  );
  return details.filter(m => m !== null);
}

async function handleToolCall(
  gmailClient: GmailClient,
  params: { name: string; arguments: Record<string, unknown> }
): Promise<unknown> {
  const { name, arguments: args } = params;

  switch (name) {
    // ── Message operations ──
    case 'list_messages': {
      const result = await gmailClient.listMessages({
        maxResults: (args.maxResults as number) || 20,
        q: args.query as string,
      });
      const validMessages = await fetchMessageDetails(gmailClient, result.messages || []);
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
        cc: args.cc as string | undefined,
        bcc: args.bcc as string | undefined,
      });
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true, id: result.id, threadId: result.threadId, action: 'send_message' }),
        }],
      };
    }

    case 'reply_to_message': {
      const result = await gmailClient.replyToMessage({
        messageId: args.messageId as string,
        body: args.body as string,
      });
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true, id: result.id, threadId: result.threadId, action: 'reply_to_message' }),
        }],
      };
    }

    case 'forward_message': {
      const result = await gmailClient.forwardMessage({
        messageId: args.messageId as string,
        to: args.to as string,
        additionalMessage: args.additionalMessage as string | undefined,
      });
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true, id: result.id, threadId: result.threadId, action: 'forward_message' }),
        }],
      };
    }

    case 'search_messages': {
      const messages = await gmailClient.searchMessages(
        args.query as string,
        (args.maxResults as number) || 20
      );
      const validMessages = await fetchMessageDetails(gmailClient, messages || []);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(validMessages, null, 2),
        }],
      };
    }

    case 'trash_message': {
      await gmailClient.trashMessage(args.messageId as string);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true, action: 'trash_message', messageId: args.messageId }),
        }],
      };
    }

    case 'untrash_message': {
      await gmailClient.untrashMessage(args.messageId as string);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true, action: 'untrash_message', messageId: args.messageId }),
        }],
      };
    }

    case 'delete_message': {
      await gmailClient.deleteMessage(args.messageId as string);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true, action: 'delete_message', messageId: args.messageId }),
        }],
      };
    }

    case 'mark_as_read': {
      await gmailClient.markAsRead(args.messageId as string);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true, action: 'mark_as_read', messageId: args.messageId }),
        }],
      };
    }

    case 'mark_as_unread': {
      await gmailClient.markAsUnread(args.messageId as string);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true, action: 'mark_as_unread', messageId: args.messageId }),
        }],
      };
    }

    case 'star_message': {
      await gmailClient.starMessage(args.messageId as string);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true, action: 'star_message', messageId: args.messageId }),
        }],
      };
    }

    case 'unstar_message': {
      await gmailClient.unstarMessage(args.messageId as string);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true, action: 'unstar_message', messageId: args.messageId }),
        }],
      };
    }

    case 'archive_message': {
      await gmailClient.archiveMessage(args.messageId as string);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true, action: 'archive_message', messageId: args.messageId }),
        }],
      };
    }

    case 'modify_labels': {
      const addLabelIds = args.addLabelIds
        ? (typeof args.addLabelIds === 'string' ? (args.addLabelIds as string).split(',').map(s => s.trim()) : args.addLabelIds as string[])
        : undefined;
      const removeLabelIds = args.removeLabelIds
        ? (typeof args.removeLabelIds === 'string' ? (args.removeLabelIds as string).split(',').map(s => s.trim()) : args.removeLabelIds as string[])
        : undefined;
      await gmailClient.modifyMessageLabels({
        messageId: args.messageId as string,
        addLabelIds,
        removeLabelIds,
      });
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true, action: 'modify_labels', messageId: args.messageId }),
        }],
      };
    }

    case 'get_unread': {
      const messages = await gmailClient.getUnreadMessages((args.maxResults as number) || 20);
      const validMessages = await fetchMessageDetails(gmailClient, messages || []);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(validMessages, null, 2),
        }],
      };
    }

    case 'get_sent': {
      const messages = await gmailClient.getSentMessages((args.maxResults as number) || 20);
      const validMessages = await fetchMessageDetails(gmailClient, messages || []);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(validMessages, null, 2),
        }],
      };
    }

    case 'get_starred': {
      const messages = await gmailClient.getStarredMessages((args.maxResults as number) || 20);
      const validMessages = await fetchMessageDetails(gmailClient, messages || []);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(validMessages, null, 2),
        }],
      };
    }

    case 'get_trashed': {
      const messages = await gmailClient.getTrashedMessages((args.maxResults as number) || 20);
      const validMessages = await fetchMessageDetails(gmailClient, messages || []);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(validMessages, null, 2),
        }],
      };
    }

    // ── Thread operations ──
    case 'list_threads': {
      const result = await gmailClient.listThreads({
        maxResults: (args.maxResults as number) || 20,
        q: args.query as string,
      });
      const threads = result.threads || [];
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ threads, nextPageToken: result.nextPageToken, action: 'list_threads' }, null, 2),
        }],
      };
    }

    case 'get_thread': {
      const thread = await gmailClient.getThread(args.threadId as string);
      const parsedMessages = (thread.messages || []).map((msg: any) => gmailClient.parseMessage(msg));
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ threadId: thread.id, messages: parsedMessages, action: 'get_thread' }, null, 2),
        }],
      };
    }

    case 'trash_thread': {
      await gmailClient.trashThread(args.threadId as string);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true, action: 'trash_thread', threadId: args.threadId }),
        }],
      };
    }

    case 'delete_thread': {
      await gmailClient.deleteThread(args.threadId as string);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true, action: 'delete_thread', threadId: args.threadId }),
        }],
      };
    }

    // ── Label operations ──
    case 'list_labels': {
      const labels = await gmailClient.listLabels();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ labels, action: 'list_labels' }, null, 2),
        }],
      };
    }

    case 'create_label': {
      const label = await gmailClient.createLabel({ name: args.name as string });
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true, action: 'create_label', id: label.id, name: label.name }),
        }],
      };
    }

    case 'update_label': {
      const label = await gmailClient.updateLabel({
        labelId: args.labelId as string,
        name: args.name as string | undefined,
      });
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true, action: 'update_label', id: label.id, name: label.name }),
        }],
      };
    }

    case 'delete_label': {
      await gmailClient.deleteLabel(args.labelId as string);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true, action: 'delete_label', labelId: args.labelId }),
        }],
      };
    }

    // ── Draft operations ──
    case 'list_drafts': {
      const result = await gmailClient.listDrafts((args.maxResults as number) || 20);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ drafts: result.drafts, action: 'list_drafts' }, null, 2),
        }],
      };
    }

    case 'create_draft': {
      const draft = await gmailClient.createDraft({
        to: args.to as string,
        subject: args.subject as string,
        body: args.body as string,
        cc: args.cc as string | undefined,
        bcc: args.bcc as string | undefined,
      });
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true, action: 'create_draft', draftId: draft.id }),
        }],
      };
    }

    case 'delete_draft': {
      await gmailClient.deleteDraft(args.draftId as string);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true, action: 'delete_draft', draftId: args.draftId }),
        }],
      };
    }

    case 'send_draft': {
      const result = await gmailClient.sendDraft(args.draftId as string);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true, action: 'send_draft', id: result.id, threadId: result.threadId }),
        }],
      };
    }

    // ── Attachment operations ──
    case 'get_attachment': {
      const attachment = await gmailClient.getAttachment(
        args.messageId as string,
        args.attachmentId as string
      );
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true, action: 'get_attachment', size: attachment.size, data: attachment.data?.substring(0, 100) + '...' }),
        }],
      };
    }

    // ── Profile ──
    case 'get_profile': {
      const profile = await gmailClient.getProfile();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ ...profile, action: 'get_profile' }, null, 2),
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
