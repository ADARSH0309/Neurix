import { Router, Request, Response } from 'express';
import { sseConnectionManager } from '../sse/index.js';
import { requireAuth } from '../auth/middleware.js';
import type { AuthenticatedRequest } from '../auth/middleware.js';
import { McpHttpAdapter } from '../mcp-adapter.js';
import { GmailClient } from '../../gmail-client.js';
import type { OAuthTokens } from '../../session/types.js';

const router: Router = Router();

/**
 * OAuth config (initialized by server)
 * This is set by the same initializeSessionMcp call in server.ts
 */
let oauthConfig: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} | null = null;

/**
 * Initialize OAuth config for SSE MCP handler
 * Called by server.ts during startup
 */
export function initializeSseMcp(
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

  // Set tokens directly on the client
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
 * MCP POST endpoint with SSE response support
 *
 * This endpoint is used by MCP SSE transport:
 * 1. Client establishes SSE connection (GET /sse)
 * 2. Server sends "endpoint" event with this POST URL
 * 3. Client sends JSON-RPC requests here
 * 4. Server sends responses via SSE connection
 *
 * Route pattern: /mcp/:connectionId
 */
router.post('/mcp/:connectionId', requireAuth(), async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const connectionId = req.params.connectionId as string;
  const jsonRpcRequest = req.body;

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'MCP SSE request received',
    connectionId,
    method: jsonRpcRequest.method,
  }));

  // Verify SSE connection exists
  const connection = sseConnectionManager.getConnection(connectionId);
  if (!connection) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message: 'SSE connection not found',
      connectionId,
    }));
    res.status(404).json({
      jsonrpc: '2.0',
      id: jsonRpcRequest.id || null,
      error: {
        code: -32000,
        message: 'SSE connection not found or expired',
      },
    });
    return;
  }

  // Get user email from session
  const userEmail = authReq.session?.userEmail;
  if (!userEmail) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message: 'No user email in session',
      connectionId,
    }));
    res.status(401).json({
      jsonrpc: '2.0',
      id: jsonRpcRequest.id || null,
      error: {
        code: -32000,
        message: 'No user email found. Please re-authenticate.',
      },
    });
    return;
  }

  // Verify connection belongs to authenticated user
  if (connection.userEmail !== userEmail) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message: 'Connection ownership mismatch',
      connectionId,
      requestUserEmail: userEmail,
      connectionUserEmail: connection.userEmail,
    }));
    res.status(403).json({
      jsonrpc: '2.0',
      id: jsonRpcRequest.id || null,
      error: {
        code: -32000,
        message: 'Connection does not belong to authenticated user',
      },
    });
    return;
  }

  try {
    // Get session and check for OAuth tokens
    const session = authReq.session;
    if (!session?.tokens) {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: 'No OAuth tokens in session',
        connectionId,
        userEmail,
      }));
      res.status(401).json({
        jsonrpc: '2.0',
        id: jsonRpcRequest.id || null,
        error: {
          code: -32000,
          message: 'No OAuth tokens found. Please re-authenticate.',
        },
      });
      return;
    }

    // Create Gmail client with session tokens
    const gmailClient = createGmailClientFromTokens(session.tokens);

    // Create MCP adapter for this request
    const mcpAdapter = new McpHttpAdapter(gmailClient);

    // Initialize the adapter (required for MCP protocol)
    await mcpAdapter.initialize();

    // Process the MCP request using the same logic as mcp-session.ts
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

      default:
        res.status(404).json({
          jsonrpc: '2.0',
          id: jsonRpcRequest.id || null,
          error: {
            code: -32601,
            message: `Method not found: ${jsonRpcRequest.method}`,
          },
        });
        return;
    }

    // Create response
    const response = {
      jsonrpc: '2.0' as const,
      id: jsonRpcRequest.id || null,
      result,
    };

    // Send response via SSE connection
    const sent = sseConnectionManager.sendMessage(connectionId, response);

    if (sent) {
      // Return 202 Accepted - response sent via SSE
      res.status(202).json({
        message: 'Request received, response sent via SSE',
        connectionId,
      });
    } else {
      // Failed to send via SSE, fall back to HTTP response
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: 'Failed to send via SSE, falling back to HTTP',
        connectionId,
      }));
      res.json(response);
    }
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Error processing MCP SSE request',
      connectionId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }));

    const errorResponse = {
      jsonrpc: '2.0',
      id: jsonRpcRequest.id || null,
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : 'Internal server error',
      },
    };

    // Try to send error via SSE, fall back to HTTP
    if (!sseConnectionManager.sendMessage(connectionId, errorResponse)) {
      res.status(500).json(errorResponse);
    } else {
      res.status(202).json({
        message: 'Error response sent via SSE',
        connectionId,
      });
    }
  }
});

export default router;
