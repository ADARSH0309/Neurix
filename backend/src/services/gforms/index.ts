import type { ServerDefinition, ServiceClient, McpAdapter } from '@neurix/server-core';
import { GFormsClient } from './client.js';
import { McpHttpAdapter } from './tools.js';

export const gformsService: ServerDefinition = {
  id: 'gforms',
  name: 'Google Forms',
  displayName: 'Google Forms MCP Server',
  port: 8081,
  callbackPath: 'g-forms',
  scopes: ['forms.body', 'forms.responses.readonly'],
  factory: {
    createClient(clientId: string, clientSecret: string, redirectUri: string): ServiceClient {
      return new GFormsClient(clientId, clientSecret, redirectUri, '');
    },
    createAdapter(client: ServiceClient): McpAdapter {
      return new McpHttpAdapter(client as GFormsClient);
    },
  },
};
