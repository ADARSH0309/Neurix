import type { ServerDefinition, ServiceClient, McpAdapter } from '@neurix/server-core';
import { GCalendarClient } from './client.js';
import { McpHttpAdapter } from './tools.js';

export const gcalendarService: ServerDefinition = {
  id: 'gcalendar',
  name: 'Google Calendar',
  displayName: 'Google Calendar MCP Server',
  port: 8083,
  callbackPath: 'g-calendar',
  scopes: ['calendar', 'calendar.events'],
  factory: {
    createClient(clientId: string, clientSecret: string, redirectUri: string): ServiceClient {
      return new GCalendarClient(clientId, clientSecret, redirectUri, '');
    },
    createAdapter(client: ServiceClient): McpAdapter {
      return new McpHttpAdapter(client as GCalendarClient);
    },
  },
};
