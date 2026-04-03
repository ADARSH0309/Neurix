import type { ServerDefinition, ServiceClient, McpAdapter } from '@neurix/server-core';
import { GTaskClient } from './client.js';
import { McpHttpAdapter } from './tools.js';

export const gtaskService: ServerDefinition = {
  id: 'gtask',
  name: 'Google Tasks',
  displayName: 'Google Tasks MCP Server',
  port: 8084,
  callbackPath: 'g-task',
  scopes: ['tasks'],
  factory: {
    createClient(clientId: string, clientSecret: string, redirectUri: string): ServiceClient {
      return new GTaskClient(clientId, clientSecret, redirectUri, '');
    },
    createAdapter(client: ServiceClient): McpAdapter {
      return new McpHttpAdapter(client as GTaskClient);
    },
  },
};
