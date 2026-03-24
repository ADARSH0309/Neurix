/**
 * Centralized MCP server configuration
 */

export interface McpServerDef {
  id: string;
  name: string;
  description: string;
  port: number;
  baseUrl: string;
  scopes: string[];
}

export const MCP_SERVER_DEFS: Record<string, McpServerDef> = {
  gdrive: { id: 'gdrive', name: 'Google Drive', description: 'Access and manage your Drive files', port: 8080, baseUrl: 'http://localhost:8080', scopes: ['drive.file'] },
  gforms: { id: 'gforms', name: 'Google Forms', description: 'Create and manage forms & surveys', port: 8081, baseUrl: 'http://localhost:8081', scopes: ['forms.body', 'forms.responses.readonly'] },
  gmail: { id: 'gmail', name: 'Gmail', description: 'Read and send emails', port: 8082, baseUrl: 'http://localhost:8082', scopes: ['gmail.modify'] },
  gcalendar: { id: 'gcalendar', name: 'Google Calendar', description: 'Manage calendars, events & scheduling', port: 8083, baseUrl: 'http://localhost:8083', scopes: ['calendar', 'calendar.events'] },
  gtask: { id: 'gtask', name: 'Google Tasks', description: 'Manage task lists & to-dos', port: 8084, baseUrl: 'http://localhost:8084', scopes: ['tasks'] },
  gsheets: { id: 'gsheets', name: 'Google Sheets', description: 'Read, write & manage spreadsheets', port: 8085, baseUrl: 'http://localhost:8085', scopes: ['spreadsheets', 'drive.file'] },
};
