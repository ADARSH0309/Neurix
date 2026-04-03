import type { ServerDefinition, ServiceClient, McpAdapter } from '@neurix/server-core';
import { GmailClient } from './client.js';
import { McpHttpAdapter } from './tools.js';

export const gmailService: ServerDefinition = {
  id: 'gmail',
  name: 'Gmail',
  displayName: 'Gmail MCP Server',
  port: 8082,
  callbackPath: 'g-mail',
  scopes: ['gmail.modify'],
  factory: {
    createClient(clientId: string, clientSecret: string, redirectUri: string): ServiceClient {
      return new GmailClient(clientId, clientSecret, redirectUri, '');
    },
    createAdapter(client: ServiceClient): McpAdapter {
      return new McpHttpAdapter(client as GmailClient);
    },
  },
};
