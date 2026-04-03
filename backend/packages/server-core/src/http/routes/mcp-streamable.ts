import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { requireAuth, optionalAuth } from '../auth/middleware.js';
import type { AuthenticatedRequest } from '../auth/middleware.js';
import { sseConnectionManager } from '../sse/connection-manager.js';
import type { OAuthTokens } from '../../session/types.js';
import type { ServiceFactory, OAuthConfig, ServiceClient } from '../../types.js';
import { healthCheckCorsMiddleware, mcpJsonParser, corsMiddleware } from '../middleware.js';
import { routeMcpRequest } from './mcp-session.js';

const router: Router = Router();

router.options('/mcp', corsMiddleware);

let oauthConfig: OAuthConfig | null = null;
let serviceFactory: ServiceFactory | null = null;

export function initializeStreamableHttp(
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

router.post('/mcp', corsMiddleware, mcpJsonParser, requireAuth(), async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const jsonRpcRequest = req.body;

  const userEmail = authReq.session?.userEmail;
  if (!userEmail) {
    res.status(401).json({
      jsonrpc: '2.0',
      id: jsonRpcRequest.id ?? null,
      error: { code: -32000, message: 'No user email found. Please re-authenticate.' },
    });
    return;
  }

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
    const session = authReq.session;
    if (!session?.tokens) {
      res.status(401).json({
        jsonrpc: '2.0',
        id: jsonRpcRequest.id ?? null,
        error: { code: -32000, message: 'No OAuth tokens found. Please re-authenticate.' },
      });
      return;
    }

    const client = createClientFromTokens(session.tokens);
    const mcpAdapter = serviceFactory!.createAdapter(client);
    await mcpAdapter.initialize();

    // Handle notifications (no response needed)
    if (jsonRpcRequest.method === 'notifications/initialized' ||
        jsonRpcRequest.method === 'notifications/cancelled' ||
        jsonRpcRequest.method === 'notifications/progress') {
      res.status(200).set('Mcp-Session-Id', sessionId).send();
      return;
    }

    const { result, error } = await routeMcpRequest(mcpAdapter, jsonRpcRequest.method, jsonRpcRequest.params);

    if (error) {
      res.status(404).set('Mcp-Session-Id', sessionId).json({
        jsonrpc: '2.0',
        id: jsonRpcRequest.id ?? null,
        error,
      });
      return;
    }

    res.status(200).set('Mcp-Session-Id', sessionId).json({
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

    res.status(500).set('Mcp-Session-Id', sessionId).json({
      jsonrpc: '2.0',
      id: jsonRpcRequest.id ?? null,
      error: { code: -32603, message: error instanceof Error ? error.message : 'Internal server error' },
    });
  }
});

router.delete('/mcp', requireAuth(), (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string;

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Streamable HTTP session termination requested',
    sessionId,
  }));

  res.status(200).json({ message: 'Session terminated', sessionId });
});

export default router;
