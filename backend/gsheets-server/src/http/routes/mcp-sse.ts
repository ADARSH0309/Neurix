import { Router, Request, Response } from 'express';
import { sseConnectionManager } from '../sse/index.js';
import { requireAuth } from '../auth/middleware.js';
import type { AuthenticatedRequest } from '../auth/middleware.js';
import { McpHttpAdapter } from '../mcp-adapter.js';
import { GSheetsClient } from '../../gsheets-client.js';
import type { OAuthTokens } from '../../session/types.js';

const router: Router = Router();

let oauthConfig: { clientId: string; clientSecret: string; redirectUri: string; } | null = null;

export function initializeSseMcp(clientId: string, clientSecret: string, redirectUri: string): void {
  oauthConfig = { clientId, clientSecret, redirectUri };
}

function createSheetsClientFromTokens(tokens: OAuthTokens): GSheetsClient {
  if (!oauthConfig) throw new Error('OAuth config not initialized');
  const client = new GSheetsClient(oauthConfig.clientId, oauthConfig.clientSecret, oauthConfig.redirectUri, '');
  client.setCredentials({ access_token: tokens.access_token, refresh_token: tokens.refresh_token, scope: tokens.scope, token_type: tokens.token_type, expiry_date: tokens.expiry_date });
  return client;
}

router.post('/mcp/:connectionId', requireAuth(), async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const connectionId = req.params.connectionId as string;
  const jsonRpcRequest = req.body;

  console.log(JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', message: 'MCP SSE request received', connectionId, method: jsonRpcRequest.method }));

  const connection = sseConnectionManager.getConnection(connectionId);
  if (!connection) {
    res.status(404).json({ jsonrpc: '2.0', id: jsonRpcRequest.id || null, error: { code: -32000, message: 'SSE connection not found or expired' } });
    return;
  }

  const userEmail = authReq.session?.userEmail;
  if (!userEmail) {
    res.status(401).json({ jsonrpc: '2.0', id: jsonRpcRequest.id || null, error: { code: -32000, message: 'No user email found. Please re-authenticate.' } });
    return;
  }

  if (connection.userEmail !== userEmail) {
    res.status(403).json({ jsonrpc: '2.0', id: jsonRpcRequest.id || null, error: { code: -32000, message: 'Connection does not belong to authenticated user' } });
    return;
  }

  try {
    const session = authReq.session;
    if (!session?.tokens) {
      res.status(401).json({ jsonrpc: '2.0', id: jsonRpcRequest.id || null, error: { code: -32000, message: 'No OAuth tokens found. Please re-authenticate.' } });
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
      default:
        res.status(404).json({ jsonrpc: '2.0', id: jsonRpcRequest.id || null, error: { code: -32601, message: `Method not found: ${jsonRpcRequest.method}` } });
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
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: 'error', message: 'Error processing MCP SSE request', connectionId, error: error instanceof Error ? error.message : 'Unknown error' }));
    const errorResponse = { jsonrpc: '2.0', id: jsonRpcRequest.id || null, error: { code: -32603, message: error instanceof Error ? error.message : 'Internal server error' } };
    if (!sseConnectionManager.sendMessage(connectionId, errorResponse)) {
      res.status(500).json(errorResponse);
    } else {
      res.status(202).json({ message: 'Error response sent via SSE', connectionId });
    }
  }
});

export default router;
