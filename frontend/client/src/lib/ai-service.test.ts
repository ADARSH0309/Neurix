import { describe, it, expect } from 'vitest';
import { mcpToolsToOpenAI } from './ai-service';
import type { McpServer } from '../types';

describe('mcpToolsToOpenAI', () => {
  const makeServer = (overrides: Partial<McpServer> = {}): McpServer => ({
    id: 'gmail',
    name: 'Gmail',
    description: 'Gmail service',
    baseUrl: 'http://localhost:8082',
    connected: true,
    status: 'available',
    tools: [
      {
        name: 'send_message',
        description: 'Send an email',
        inputSchema: {
          type: 'object',
          properties: { to: { type: 'string' }, body: { type: 'string' } },
          required: ['to', 'body'],
        },
      },
    ],
    ...overrides,
  });

  it('converts MCP tools to OpenAI format with server prefix', () => {
    const servers = { gmail: makeServer() };
    const result = mcpToolsToOpenAI(servers);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('function');
    expect(result[0].function.name).toBe('gmail__send_message');
    expect(result[0].function.description).toContain('[Gmail]');
  });

  it('skips disconnected servers', () => {
    const servers = { gmail: makeServer({ connected: false }) };
    const result = mcpToolsToOpenAI(servers);
    expect(result).toHaveLength(0);
  });

  it('skips servers with no tools', () => {
    const servers = { gmail: makeServer({ tools: [] }) };
    const result = mcpToolsToOpenAI(servers);
    expect(result).toHaveLength(0);
  });

  it('skips servers with undefined tools', () => {
    const servers = { gmail: makeServer({ tools: undefined }) };
    const result = mcpToolsToOpenAI(servers);
    expect(result).toHaveLength(0);
  });

  it('handles multiple servers', () => {
    const servers = {
      gmail: makeServer(),
      gdrive: makeServer({
        id: 'gdrive',
        name: 'Google Drive',
        tools: [
          {
            name: 'list_files',
            description: 'List files',
            inputSchema: { type: 'object' },
          },
        ],
      }),
    };
    const result = mcpToolsToOpenAI(servers);
    expect(result).toHaveLength(2);
    expect(result.map(r => r.function.name)).toContain('gmail__send_message');
    expect(result.map(r => r.function.name)).toContain('gdrive__list_files');
  });

  it('returns empty array for empty servers', () => {
    expect(mcpToolsToOpenAI({})).toEqual([]);
  });
});
