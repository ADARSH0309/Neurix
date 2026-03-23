import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { requireAuth, optionalAuth } from '../auth/middleware.js';
import type { AuthenticatedRequest } from '../auth/middleware.js';
import { sseConnectionManager } from '../sse/connection-manager.js';
import { McpHttpAdapter } from '../mcp-adapter.js';
import { GSheetsClient } from '../../gsheets-client.js';
import type { OAuthTokens } from '../../session/types.js';
import { healthCheckCorsMiddleware, mcpJsonParser, corsMiddleware } from '../middleware.js';

const router: Router = Router();
router.options('/mcp', corsMiddleware);

let oauthConfig: { clientId: string; clientSecret: string; redirectUri: string; } | null = null;

export function initializeStreamableHttp(clientId: string, clientSecret: string, redirectUri: string): void {
  oauthConfig = { clientId, clientSecret, redirectUri };
}

function createSheetsClientFromTokens(tokens: OAuthTokens): GSheetsClient {
  if (!oauthConfig) throw new Error('OAuth config not initialized');
  const client = new GSheetsClient(oauthConfig.clientId, oauthConfig.clientSecret, oauthConfig.redirectUri, '');
  client.setCredentials({ access_token: tokens.access_token, refresh_token: tokens.refresh_token, scope: tokens.scope, token_type: tokens.token_type, expiry_date: tokens.expiry_date });
  return client;
}

router.post('/mcp', corsMiddleware, mcpJsonParser, requireAuth(), async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const jsonRpcRequest = req.body;
  const userEmail = authReq.session?.userEmail;

  if (!userEmail) {
    res.status(401).json({ jsonrpc: '2.0', id: jsonRpcRequest.id ?? null, error: { code: -32000, message: 'No user email found. Please re-authenticate.' } });
    return;
  }

  const sessionId = req.headers['mcp-session-id'] as string || authReq.sessionId || randomUUID();

  try {
    const session = authReq.session;
    if (!session?.tokens) {
      res.status(401).json({ jsonrpc: '2.0', id: jsonRpcRequest.id ?? null, error: { code: -32000, message: 'No OAuth tokens found. Please re-authenticate.' } });
      return;
    }

    const sheetsClient = createSheetsClientFromTokens(session.tokens);
    const mcpAdapter = new McpHttpAdapter(sheetsClient);
    await mcpAdapter.initialize();

    let result: any;
    switch (jsonRpcRequest.method) {
      case 'initialize': result = await mcpAdapter.initialize(); break;
      case 'tools/list': result = await mcpAdapter.listTools(); break;
      case 'tools/call': { const { name, arguments: args } = jsonRpcRequest.params || {}; if (!name) throw new Error('Missing tool name in params'); result = await mcpAdapter.callTool(name, args || {}); break; }
      case 'resources/list': result = await mcpAdapter.listResources(); break;
      case 'resources/read': { const { uri } = jsonRpcRequest.params || {}; if (!uri) throw new Error('Missing resource URI in params'); result = await mcpAdapter.readResource(uri); break; }
      case 'prompts/list': result = await mcpAdapter.listPrompts(); break;
      case 'prompts/get': { const { name, arguments: args } = jsonRpcRequest.params || {}; if (!name) throw new Error('Missing prompt name in params'); result = await mcpAdapter.getPrompt(name, args || {}); break; }
      case 'notifications/initialized':
      case 'notifications/cancelled':
      case 'notifications/progress':
        res.status(200).set('Mcp-Session-Id', sessionId).send();
        return;
      default:
        res.status(404).set('Mcp-Session-Id', sessionId).json({ jsonrpc: '2.0', id: jsonRpcRequest.id ?? null, error: { code: -32601, message: `Method not found: ${jsonRpcRequest.method}` } });
        return;
    }

    res.status(200).set('Mcp-Session-Id', sessionId).json({ jsonrpc: '2.0', id: jsonRpcRequest.id ?? null, result });
  } catch (error) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: 'error', message: 'Error processing Streamable HTTP request', sessionId, error: error instanceof Error ? error.message : 'Unknown error' }));
    res.status(500).set('Mcp-Session-Id', sessionId).json({ jsonrpc: '2.0', id: jsonRpcRequest.id ?? null, error: { code: -32603, message: error instanceof Error ? error.message : 'Internal server error' } });
  }
});

router.delete('/mcp', requireAuth(), (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string;
  res.status(200).json({ message: 'Session terminated', sessionId });
});

export default router;
