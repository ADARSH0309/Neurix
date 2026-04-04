/**
 * Gateway Adapter — combines all 6 Google service adapters into one.
 *
 * - listTools() returns tools from ALL services, prefixed with service id
 * - callTool('gdrive__list_files', args) routes to the gdrive adapter
 * - setCredentials() fans out to all service clients
 */

import type {
  ServerDefinition,
  ServiceClient,
  ServiceFactory,
  McpAdapter,
  OAuthTokenSet,
} from '@neurix/server-core';

import { allServices } from './services/index.js';

// ── Gateway Client: fans out credentials to all service clients ─────────────

class GatewayClient implements ServiceClient {
  private clients: Map<string, ServiceClient> = new Map();

  constructor(
    private serviceDefinitions: ServerDefinition[],
    clientId: string,
    clientSecret: string,
    redirectUri: string,
  ) {
    for (const def of serviceDefinitions) {
      this.clients.set(def.id, def.factory.createClient(clientId, clientSecret, redirectUri));
    }
  }

  setCredentials(tokens: OAuthTokenSet): void {
    for (const client of this.clients.values()) {
      client.setCredentials(tokens);
    }
  }

  getClient(serviceId: string): ServiceClient | undefined {
    return this.clients.get(serviceId);
  }
}

// ── Gateway Adapter: aggregates tools from all services ─────────────────────

class GatewayAdapter implements McpAdapter {
  private adapters: Map<string, McpAdapter> = new Map();

  constructor(gatewayClient: GatewayClient, serviceDefinitions: ServerDefinition[]) {
    for (const def of serviceDefinitions) {
      const client = gatewayClient.getClient(def.id);
      if (client) {
        this.adapters.set(def.id, def.factory.createAdapter(client));
      }
    }
  }

  async initialize(): Promise<void> {
    await Promise.all(
      Array.from(this.adapters.values()).map((a) => a.initialize()),
    );
  }

  async listTools(): Promise<any> {
    const allTools: any[] = [];

    for (const [serviceId, adapter] of this.adapters) {
      const tools = await adapter.listTools();
      const toolList = Array.isArray(tools) ? tools : tools?.tools || [];

      for (const tool of toolList) {
        allTools.push({
          ...tool,
          name: `${serviceId}__${tool.name}`,
        });
      }
    }

    return { tools: allTools };
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<any> {
    const separatorIndex = name.indexOf('__');
    if (separatorIndex === -1) {
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}. Use format: service__tool_name` }],
        isError: true,
      };
    }

    const serviceId = name.substring(0, separatorIndex);
    const toolName = name.substring(separatorIndex + 2);
    const adapter = this.adapters.get(serviceId);

    if (!adapter) {
      return {
        content: [{ type: 'text', text: `Unknown service: ${serviceId}. Available: ${Array.from(this.adapters.keys()).join(', ')}` }],
        isError: true,
      };
    }

    return adapter.callTool(toolName, args);
  }

  async listResources(): Promise<any> {
    const allResources: any[] = [];
    for (const adapter of this.adapters.values()) {
      const resources = await adapter.listResources();
      const list = Array.isArray(resources) ? resources : resources?.resources || [];
      allResources.push(...list);
    }
    return allResources;
  }

  async readResource(uri: string): Promise<any> {
    for (const adapter of this.adapters.values()) {
      try {
        const result = await adapter.readResource(uri);
        if (result) return result;
      } catch { /* try next */ }
    }
    return { contents: [{ uri, text: 'Resource not found' }] };
  }

  async listPrompts(): Promise<any> {
    const allPrompts: any[] = [];
    for (const [serviceId, adapter] of this.adapters) {
      const prompts = await adapter.listPrompts();
      const list = Array.isArray(prompts) ? prompts : prompts?.prompts || [];
      for (const prompt of list) {
        allPrompts.push({ ...prompt, name: `${serviceId}__${prompt.name}` });
      }
    }
    return allPrompts;
  }

  async getPrompt(name: string, args: Record<string, unknown>): Promise<any> {
    const separatorIndex = name.indexOf('__');
    if (separatorIndex === -1) return { messages: [] };

    const serviceId = name.substring(0, separatorIndex);
    const promptName = name.substring(separatorIndex + 2);
    const adapter = this.adapters.get(serviceId);

    if (!adapter) return { messages: [] };
    return adapter.getPrompt(promptName, args);
  }
}

// ── Gateway ServerDefinition ────────────────────────────────────────────────

const allScopes = [...new Set(allServices.flatMap((s) => s.scopes))];

export const gatewayDefinition: ServerDefinition = {
  id: 'gateway',
  name: 'Neurix Gateway',
  displayName: 'Neurix MCP Gateway',
  port: 8080,
  callbackPath: 'gateway',
  scopes: allScopes,
  factory: {
    createClient(clientId: string, clientSecret: string, redirectUri: string): ServiceClient {
      return new GatewayClient(allServices, clientId, clientSecret, redirectUri);
    },
    createAdapter(client: ServiceClient): McpAdapter {
      return new GatewayAdapter(client as GatewayClient, allServices);
    },
  },
};
