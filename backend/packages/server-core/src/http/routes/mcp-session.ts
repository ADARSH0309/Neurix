/**
 * Session-based MCP Request Handler (Generic)
 *
 * Implements per-session MCP adapters with OAuth tokens from Redis.
 * Uses ServiceFactory to create service-specific clients and adapters.
 */

import { Response } from 'express';
import { sessionManager } from '../../session/index.js';
import { OAuthClientManager } from '../oauth/client.js';
import type { OAuthTokens } from '../../session/types.js';
import type { AuthenticatedRequest } from '../auth/middleware.js';
import { mcp_request_duration_seconds } from '../metrics/prometheus.js';
import type { ServiceFactory, OAuthConfig, McpAdapter, ServiceClient } from '../../types.js';

const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000; // Refresh 5 minutes before expiry

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: any;
}

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

const JsonRpcErrorCode = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  UNAUTHORIZED: -32000,
};

let oauthConfig: OAuthConfig | null = null;
let oauthClientManager: OAuthClientManager | null = null;
let serviceFactory: ServiceFactory | null = null;

/**
 * Initialize OAuth config and service factory for session-based MCP adapters
 */
export function initializeSessionMcp(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  factory: ServiceFactory,
): void {
  oauthConfig = { clientId, clientSecret, redirectUri };
  oauthClientManager = new OAuthClientManager(oauthConfig);
  serviceFactory = factory;
}

function tokenNeedsRefresh(tokens: OAuthTokens): boolean {
  return tokens.expiry_date <= Date.now() + TOKEN_REFRESH_BUFFER;
}

async function ensureFreshTokens(
  sessionId: string,
  tokens: OAuthTokens
): Promise<OAuthTokens> {
  if (!oauthClientManager) {
    throw new Error('OAuth client manager not initialized');
  }

  if (!tokenNeedsRefresh(tokens)) {
    return tokens;
  }

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Refreshing expired access token',
    sessionId,
    expiryDate: new Date(tokens.expiry_date).toISOString(),
  }));

  const refreshedTokens = await oauthClientManager.refreshAccessToken(tokens.refresh_token);
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

function createClientFromTokens(tokens: OAuthTokens): ServiceClient {
  if (!oauthConfig || !serviceFactory) {
    throw new Error('OAuth config or service factory not initialized');
  }

  const client = serviceFactory.createClient(
    oauthConfig.clientId,
    oauthConfig.clientSecret,
    oauthConfig.redirectUri,
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
 * Route a JSON-RPC request to the appropriate MCP adapter method.
 * Shared across mcp-session, mcp-sse, and mcp-streamable.
 */
export async function routeMcpRequest(
  mcpAdapter: McpAdapter,
  method: string,
  params: any
): Promise<{ result?: any; error?: { code: number; message: string } }> {
  switch (method) {
    case 'initialize':
      return { result: await mcpAdapter.initialize() };
    case 'tools/list':
      return { result: await mcpAdapter.listTools() };
    case 'tools/call': {
      const { name, arguments: args } = params || {};
      if (!name) throw new Error('Missing tool name in params');
      return { result: await mcpAdapter.callTool(name, args || {}) };
    }
    case 'resources/list':
      return { result: await mcpAdapter.listResources() };
    case 'resources/read': {
      const { uri } = params || {};
      if (!uri) throw new Error('Missing resource URI in params');
      return { result: await mcpAdapter.readResource(uri) };
    }
    case 'prompts/list':
      return { result: await mcpAdapter.listPrompts() };
    case 'prompts/get': {
      const { name, arguments: args } = params || {};
      if (!name) throw new Error('Missing prompt name in params');
      return { result: await mcpAdapter.getPrompt(name, args || {}) };
    }
    default:
      return { error: { code: JsonRpcErrorCode.METHOD_NOT_FOUND, message: `Method not found: ${method}` } };
  }
}

export async function handleSessionMcpRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
  const timer = mcp_request_duration_seconds.startTimer();

  try {
    if (!oauthConfig || !serviceFactory) {
      timer({ method: 'unknown', status: 'error' });
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: JsonRpcErrorCode.INTERNAL_ERROR, message: 'OAuth configuration not initialized' },
      });
      return;
    }

    const session = req.session!;
    const sessionId = req.sessionId!;

    if (!session.tokens) {
      timer({ method: 'unknown', status: 'error' });
      res.status(401).json({
        jsonrpc: '2.0',
        error: { code: JsonRpcErrorCode.UNAUTHORIZED, message: 'Session does not have OAuth tokens. Please re-authenticate at /auth/login' },
      });
      return;
    }

    const freshTokens = await ensureFreshTokens(sessionId, session.tokens);
    const rpcRequest = req.body as JsonRpcRequest;

    const client = createClientFromTokens(freshTokens);
    const mcpAdapter = serviceFactory.createAdapter(client);

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Processing MCP request',
      sessionId: session.id,
      userEmail: session.userEmail,
      method: rpcRequest.method,
      requestId: rpcRequest.id,
    }));

    const { result, error } = await routeMcpRequest(mcpAdapter, rpcRequest.method, rpcRequest.params);

    if (error) {
      timer({ method: rpcRequest.method, status: 'error' });
      res.status(404).json({ jsonrpc: '2.0', id: rpcRequest.id || null, error });
      return;
    }

    timer({ method: rpcRequest.method, status: 'success' });

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
    timer({ method: rpcRequest?.method || 'unknown', status: 'error' });

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
        error: { code: JsonRpcErrorCode.UNAUTHORIZED, message: 'Your session has expired or authentication is no longer valid. Please re-authenticate at /auth/login' },
      });
    } else {
      res.status(500).json({
        jsonrpc: '2.0',
        id: rpcRequest?.id || null,
        error: { code: JsonRpcErrorCode.INTERNAL_ERROR, message: error instanceof Error ? error.message : 'Internal server error' },
      });
    }
  }
}
