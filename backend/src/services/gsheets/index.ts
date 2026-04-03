import type { ServerDefinition, ServiceClient, McpAdapter } from '@neurix/server-core';
import { GSheetsClient } from './client.js';
import { McpHttpAdapter } from './tools.js';

export const gsheetsService: ServerDefinition = {
  id: 'gsheets',
  name: 'Google Sheets',
  displayName: 'Google Sheets MCP Server',
  port: 8085,
  callbackPath: 'g-sheet',
  scopes: ['spreadsheets', 'drive.file'],
  factory: {
    createClient(clientId: string, clientSecret: string, redirectUri: string): ServiceClient {
      return new GSheetsClient(clientId, clientSecret, redirectUri, '');
    },
    createAdapter(client: ServiceClient): McpAdapter {
      return new McpHttpAdapter(client as GSheetsClient);
    },
  },
};
