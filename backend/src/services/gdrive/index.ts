import type { ServerDefinition, ServiceClient, McpAdapter } from '@neurix/server-core';
import { GDriveClient } from './client.js';
import { McpHttpAdapter } from './tools.js';

export const gdriveService: ServerDefinition = {
  id: 'gdrive',
  name: 'Google Drive',
  displayName: 'Google Drive MCP Server',
  port: 8080,
  callbackPath: 'g-drive',
  scopes: ['drive.readonly', 'drive.file'],
  factory: {
    createClient(clientId: string, clientSecret: string, redirectUri: string): ServiceClient {
      return new GDriveClient(clientId, clientSecret, redirectUri, '');
    },
    createAdapter(client: ServiceClient): McpAdapter {
      return new McpHttpAdapter(client as GDriveClient);
    },
  },
};
