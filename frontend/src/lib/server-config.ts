/**
 * Centralized MCP server configuration
 *
 * All services are accessed through a single gateway at port 8080.
 */

export const GATEWAY_URL = import.meta.env.VITE_MCP_SERVER_URL || 'http://localhost:8080';

export interface McpServerDef {
  id: string;
  name: string;
  description: string;
  port: number;
  baseUrl: string;
  scopes: string[];
}

export const MCP_SERVER_DEFS: Record<string, McpServerDef> = {
  gdrive: { id: 'gdrive', name: 'Google Drive', description: 'Access and manage your Drive files', port: 8080, baseUrl: GATEWAY_URL, scopes: ['drive.file'] },
  gforms: { id: 'gforms', name: 'Google Forms', description: 'Create and manage forms & surveys', port: 8080, baseUrl: GATEWAY_URL, scopes: ['forms.body', 'forms.responses.readonly'] },
  gmail: { id: 'gmail', name: 'Gmail', description: 'Read and send emails', port: 8080, baseUrl: GATEWAY_URL, scopes: ['gmail.modify'] },
  gcalendar: { id: 'gcalendar', name: 'Google Calendar', description: 'Manage calendars, events & scheduling', port: 8080, baseUrl: GATEWAY_URL, scopes: ['calendar', 'calendar.events'] },
  gtask: { id: 'gtask', name: 'Google Tasks', description: 'Manage task lists & to-dos', port: 8080, baseUrl: GATEWAY_URL, scopes: ['tasks'] },
  gsheets: { id: 'gsheets', name: 'Google Sheets', description: 'Read, write & manage spreadsheets', port: 8080, baseUrl: GATEWAY_URL, scopes: ['spreadsheets', 'drive.file'] },
};
