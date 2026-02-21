/**
 * MCP JSON-RPC Route
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import { McpHttpAdapter } from '../mcp-adapter.js';

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

export function createMcpHandler(adapter: McpHttpAdapter, isAuthenticated: () => boolean) {
  return async (req: Request, res: Response): Promise<void> => {
    if (!isAuthenticated()) {
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
          result = await adapter.initialize();
          break;

        case 'tools/list':
          result = await adapter.listTools();
          break;

        case 'tools/call':
          result = await adapter.callTool(
            (params as { name: string; arguments: Record<string, unknown> }).name,
            (params as { name: string; arguments: Record<string, unknown> }).arguments
          );
          break;

        case 'resources/list':
          result = await adapter.listResources();
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
  };
}
