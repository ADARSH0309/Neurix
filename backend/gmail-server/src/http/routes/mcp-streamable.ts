import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { requireAuth, optionalAuth } from '../auth/middleware.js';
import type { AuthenticatedRequest } from '../auth/middleware.js';
import { sseConnectionManager } from '../sse/connection-manager.js';
import { McpHttpAdapter } from '../mcp-adapter.js';
import { GmailClient } from '../../gmail-client.js';
import type { OAuthTokens } from '../../session/types.js';
import { healthCheckCorsMiddleware, mcpJsonParser, corsMiddleware } from '../middleware.js';

const router: Router = Router();

/**
 * CORS preflight handler for /mcp endpoint
 * Required because this router is mounted BEFORE global CORS middleware
 */
router.options('/mcp', corsMiddleware);

/**
 * OAuth config (initialized by server)
 */
let oauthConfig: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} | null = null;

/**
 * Initialize OAuth config for Streamable HTTP
 */
export function initializeStreamableHttp(
  clientId: string,
  clientSecret: string,
  redirectUri: string
): void {
  oauthConfig = { clientId, clientSecret, redirectUri };
}

/**
 * Create GmailClient from OAuth tokens
 */
function createGmailClientFromTokens(tokens: OAuthTokens): GmailClient {
  if (!oauthConfig) {
    throw new Error('OAuth config not initialized');
  }

  const client = new GmailClient(
    oauthConfig.clientId,
    oauthConfig.clientSecret,
    oauthConfig.redirectUri,
    '', // No token path needed for session-based auth
    undefined // No metrics callback for per-request clients
  );

  client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    scope: tokens.scope,
    token_type: tokens.token_type,
    expiry_date: tokens.expiry_date,
  });

  return client;
}

/**
 * Streamable HTTP Unified Endpoint
 *
 * Implements MCP Streamable HTTP transport (2025-03-26 spec):
 * - POST: Send JSON-RPC requests, receive responses (optionally streamed)
 * - GET: Establish SSE stream for server-initiated messages
 * - DELETE: Terminate session (optional)
 *
 * Uses Mcp-Session-Id header for session management
 */

/**
 * POST: Process JSON-RPC requests
 * Returns standard HTTP response or can upgrade to SSE for streaming
 */
router.post('/mcp', corsMiddleware, mcpJsonParser, requireAuth(), async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const jsonRpcRequest = req.body;

  const userEmail = authReq.session?.userEmail;
  if (!userEmail) {
    res.status(401).json({
      jsonrpc: '2.0',
      id: jsonRpcRequest.id ?? null,
      error: {
        code: -32000,
        message: 'No user email found. Please re-authenticate.',
      },
    });
    return;
  }

  // Get or create session ID
  const sessionId = req.headers['mcp-session-id'] as string || authReq.sessionId || randomUUID();

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Streamable HTTP request received',
    sessionId,
    method: jsonRpcRequest.method,
    requestId: jsonRpcRequest.id,
  }));

  try {
    // Get OAuth tokens from session
    const session = authReq.session;
    if (!session?.tokens) {
      res.status(401).json({
        jsonrpc: '2.0',
        id: jsonRpcRequest.id ?? null,
        error: {
          code: -32000,
          message: 'No OAuth tokens found. Please re-authenticate.',
        },
      });
      return;
    }

    // Create Gmail client
    const gmailClient = createGmailClientFromTokens(session.tokens);
    const mcpAdapter = new McpHttpAdapter(gmailClient);
    await mcpAdapter.initialize();

    // Process MCP request
    let result: any;

    switch (jsonRpcRequest.method) {
      case 'initialize':
        result = await mcpAdapter.initialize();
        break;

      case 'tools/list':
        result = await mcpAdapter.listTools();
        break;

      case 'tools/call': {
        const { name, arguments: args } = jsonRpcRequest.params || {};
        if (!name) {
          throw new Error('Missing tool name in params');
        }
        result = await mcpAdapter.callTool(name, args || {});
        break;
      }

      case 'resources/list':
        result = await mcpAdapter.listResources();
        break;

      case 'resources/read': {
        const { uri } = jsonRpcRequest.params || {};
        if (!uri) {
          throw new Error('Missing resource URI in params');
        }
        result = await mcpAdapter.readResource(uri);
        break;
      }

      case 'prompts/list':
        result = await mcpAdapter.listPrompts();
        break;

      case 'prompts/get': {
        const { name, arguments: args } = jsonRpcRequest.params || {};
        if (!name) {
          throw new Error('Missing prompt name in params');
        }
        result = await mcpAdapter.getPrompt(name, args || {});
        break;
      }

      case 'notifications/initialized':
      case 'notifications/cancelled':
      case 'notifications/progress':
        // Notifications don't require a response, just acknowledge
        res.status(200).set('Mcp-Session-Id', sessionId).send();
        return;

      default:
        res
          .status(404)
          .set('Mcp-Session-Id', sessionId)
          .json({
            jsonrpc: '2.0',
            id: jsonRpcRequest.id ?? null,
            error: {
              code: -32601,
              message: `Method not found: ${jsonRpcRequest.method}`,
            },
          });
        return;
    }

    // Send response with Mcp-Session-Id header
    res
      .status(200)
      .set('Mcp-Session-Id', sessionId)
      .json({
        jsonrpc: '2.0',
        id: jsonRpcRequest.id ?? null,
        result,
      });

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Streamable HTTP response sent',
      sessionId,
      method: jsonRpcRequest.method,
      requestId: jsonRpcRequest.id,
    }));
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Error processing Streamable HTTP request',
      sessionId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }));

    res
      .status(500)
      .set('Mcp-Session-Id', sessionId)
      .json({
        jsonrpc: '2.0',
        id: jsonRpcRequest.id ?? null,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal server error',
        },
      });
  }
});

/**
 * DELETE: Terminate session (optional)
 */
router.delete('/mcp', requireAuth(), (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string;

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Streamable HTTP session termination requested',
    sessionId,
  }));

  res.status(200).json({
    message: 'Session terminated',
    sessionId,
  });
});

export default router;
