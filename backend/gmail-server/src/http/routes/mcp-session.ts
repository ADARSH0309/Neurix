/**
 * Session-based MCP Request Handler
 *
 * Implements per-session MCP adapters with OAuth tokens from Redis.
 * Each authenticated session gets its own GmailClient and MCP adapter instance.
 */

import { Response } from 'express';
import { McpHttpAdapter } from '../mcp-adapter.js';
import { GmailClient } from '../../gmail-client.js';
import { sessionManager } from '../../session/index.js';
import { OAuthClientManager } from '../oauth/client.js';
import type { OAuthTokens } from '../../session/types.js';
import type { AuthenticatedRequest } from '../auth/middleware.js';
import { mcp_request_duration_seconds } from '../metrics/prometheus.js';

const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000; // Refresh 5 minutes before expiry

/**
 * JSON-RPC 2.0 Request
 */
interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: any;
}

/**
 * JSON-RPC 2.0 Response
 */
interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * JSON-RPC Error Codes
 */
const JsonRpcErrorCode = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  UNAUTHORIZED: -32000, // Custom code for authentication errors
};

/**
 * OAuth config and client for creating GmailClient instances and refreshing tokens
 */
let oauthConfig: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} | null = null;

let oauthClientManager: OAuthClientManager | null = null;

/**
 * Initialize OAuth config for session-based MCP adapters
 */
export function initializeSessionMcp(
  clientId: string,
  clientSecret: string,
  redirectUri: string
): void {
  oauthConfig = { clientId, clientSecret, redirectUri };
  oauthClientManager = new OAuthClientManager(oauthConfig);
}

/**
 * Check if token needs refresh (expired or about to expire)
 */
function tokenNeedsRefresh(tokens: OAuthTokens): boolean {
  const now = Date.now();
  const expiresAt = tokens.expiry_date;

  // Refresh if expired or expires within buffer period
  return expiresAt <= now + TOKEN_REFRESH_BUFFER;
}

/**
 * Refresh access token if needed
 */
async function ensureFreshTokens(
  sessionId: string,
  tokens: OAuthTokens
): Promise<OAuthTokens> {
  if (!oauthClientManager) {
    throw new Error('OAuth client manager not initialized');
  }

  // Check if refresh needed
  if (!tokenNeedsRefresh(tokens)) {
    return tokens; // Token still valid
  }

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Refreshing expired access token',
    sessionId,
    expiryDate: new Date(tokens.expiry_date).toISOString(),
  }));

  // Refresh the token
  const refreshedTokens = await oauthClientManager.refreshAccessToken(tokens.refresh_token);

  // Update session with new tokens
  await sessionManager.storeTokens(sessionId, refreshedTokens);

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Access token refreshed successfully',
    sessionId,
    newExpiryDate: new Date(refreshedTokens.expiry_date).toISOString(),
  }));

  return refreshedTokens;
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

  // Set tokens directly on the client using the public method
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
 * Handle MCP JSON-RPC requests with dual authentication
 *
 * Input validation performed by Zod middleware (jsonRpcRequestSchema)
 * before this function is called. req.body is guaranteed to be valid JSON-RPC 2.0.
 *
 * Note: Authentication is handled by middleware (requireAuth).
 * This function receives an authenticated request with session data.
 */
export async function handleSessionMcpRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
  // Start timing the request
  const timer = mcp_request_duration_seconds.startTimer();

  try {
    // Check OAuth config
    if (!oauthConfig) {
      timer({ method: 'unknown', status: 'error' });

      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: JsonRpcErrorCode.INTERNAL_ERROR,
          message: 'OAuth configuration not initialized',
        },
      });
      return;
    }

    // Session is guaranteed to exist and be authenticated by middleware
    const session = req.session!;
    const sessionId = req.sessionId!;

    // Check if session has OAuth tokens
    if (!session.tokens) {
      timer({ method: 'unknown', status: 'error' });

      res.status(401).json({
        jsonrpc: '2.0',
        error: {
          code: JsonRpcErrorCode.UNAUTHORIZED,
          message: 'Session does not have OAuth tokens. Please re-authenticate at /auth/login',
        },
      });
      return;
    }

    // Ensure tokens are fresh (refresh if needed)
    const freshTokens = await ensureFreshTokens(sessionId, session.tokens);

    // Parse request (guaranteed valid by Zod middleware)
    const rpcRequest = req.body as JsonRpcRequest;

    // Create per-session GmailClient and MCP adapter with fresh tokens
    const gmailClient = createGmailClientFromTokens(freshTokens);
    const mcpAdapter = new McpHttpAdapter(gmailClient);

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Processing MCP request',
      sessionId: session.id,
      userEmail: session.userEmail,
      method: rpcRequest.method,
      requestId: rpcRequest.id,
    }));

    // Route the request to the appropriate handler
    let result: any;

    switch (rpcRequest.method) {
      case 'initialize':
        result = await mcpAdapter.initialize();
        break;

      case 'tools/list':
        result = await mcpAdapter.listTools();
        break;

      case 'tools/call': {
        const { name, arguments: args } = rpcRequest.params || {};
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
        const { uri } = rpcRequest.params || {};
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
        const { name, arguments: args } = rpcRequest.params || {};
        if (!name) {
          throw new Error('Missing prompt name in params');
        }
        result = await mcpAdapter.getPrompt(name, args || {});
        break;
      }

      default:
        timer({ method: rpcRequest.method, status: 'error' });

        res.status(404).json({
          jsonrpc: '2.0',
          id: rpcRequest.id || null,
          error: {
            code: JsonRpcErrorCode.METHOD_NOT_FOUND,
            message: `Method not found: ${rpcRequest.method}`,
          },
        });
        return;
    }

    // End timer with success status
    timer({ method: rpcRequest.method, status: 'success' });

    // Send successful response
    const response: JsonRpcResponse = {
      jsonrpc: '2.0',
      id: rpcRequest.id || null,
      result,
    };

    res.json(response);
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'MCP request failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }));

    const rpcRequest = req.body as JsonRpcRequest;

    // End timer with error status
    timer({ method: rpcRequest?.method || 'unknown', status: 'error' });

    // Detect token refresh errors and provide user-friendly messages
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isTokenRefreshError =
      errorMessage.includes('refresh') ||
      errorMessage.includes('token') ||
      errorMessage.includes('invalid_grant') ||
      errorMessage.includes('credentials');

    if (isTokenRefreshError) {
      res.status(401).json({
        jsonrpc: '2.0',
        id: rpcRequest?.id || null,
        error: {
          code: JsonRpcErrorCode.UNAUTHORIZED,
          message: 'Your session has expired or authentication is no longer valid. Please re-authenticate at /auth/login',
        },
      });
    } else {
      res.status(500).json({
        jsonrpc: '2.0',
        id: rpcRequest?.id || null,
        error: {
          code: JsonRpcErrorCode.INTERNAL_ERROR,
          message: error instanceof Error ? error.message : 'Internal server error',
        },
      });
    }
  }
}
