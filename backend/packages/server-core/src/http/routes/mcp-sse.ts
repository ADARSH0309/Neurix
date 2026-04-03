import { Router, Request, Response } from 'express';
import { sseConnectionManager } from '../sse/index.js';
import { requireAuth } from '../auth/middleware.js';
import type { AuthenticatedRequest } from '../auth/middleware.js';
import type { OAuthTokens } from '../../session/types.js';
import type { ServiceFactory, OAuthConfig, ServiceClient } from '../../types.js';
import { routeMcpRequest } from './mcp-session.js';

const router: Router = Router();

let oauthConfig: OAuthConfig | null = null;
let serviceFactory: ServiceFactory | null = null;

export function initializeSseMcp(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  factory: ServiceFactory,
): void {
  oauthConfig = { clientId, clientSecret, redirectUri };
  serviceFactory = factory;
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

  const connection = sseConnectionManager.getConnection(connectionId);
  if (!connection) {
    res.status(404).json({
      jsonrpc: '2.0',
      id: jsonRpcRequest.id || null,
      error: { code: -32000, message: 'SSE connection not found or expired' },
    });
    return;
  }

  const userEmail = authReq.session?.userEmail;
  if (!userEmail) {
    res.status(401).json({
      jsonrpc: '2.0',
      id: jsonRpcRequest.id || null,
      error: { code: -32000, message: 'No user email found. Please re-authenticate.' },
    });
    return;
  }

  if (connection.userEmail !== userEmail) {
    res.status(403).json({
      jsonrpc: '2.0',
      id: jsonRpcRequest.id || null,
      error: { code: -32000, message: 'Connection does not belong to authenticated user' },
    });
    return;
  }

  try {
    const session = authReq.session;
    if (!session?.tokens) {
      res.status(401).json({
        jsonrpc: '2.0',
        id: jsonRpcRequest.id || null,
        error: { code: -32000, message: 'No OAuth tokens found. Please re-authenticate.' },
      });
      return;
    }

    const client = createClientFromTokens(session.tokens);
    const mcpAdapter = serviceFactory!.createAdapter(client);
    await mcpAdapter.initialize();

    const { result, error } = await routeMcpRequest(mcpAdapter, jsonRpcRequest.method, jsonRpcRequest.params);

    if (error) {
      res.status(404).json({ jsonrpc: '2.0', id: jsonRpcRequest.id || null, error });
      return;
    }

    const response = { jsonrpc: '2.0' as const, id: jsonRpcRequest.id || null, result };
    const sent = sseConnectionManager.sendMessage(connectionId, response);

    if (sent) {
      res.status(202).json({ message: 'Request received, response sent via SSE', connectionId });
    } else {
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
      error: { code: -32603, message: error instanceof Error ? error.message : 'Internal server error' },
    };

    if (!sseConnectionManager.sendMessage(connectionId, errorResponse)) {
      res.status(500).json(errorResponse);
    } else {
      res.status(202).json({ message: 'Error response sent via SSE', connectionId });
    }
  }
});

export default router;
