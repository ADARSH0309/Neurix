/**
 * Neurix MCP SDK
 * Base server class for building MCP servers
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  CallToolResult,
  ReadResourceResult,
  GetPromptResult,
  Tool,
  Resource,
  Prompt,
} from '@modelcontextprotocol/sdk/types.js';

export interface NeurixServerConfig {
  name: string;
  version: string;
  description?: string;
}

export interface Logger {
  info(message: string, ...args: unknown[]): void;
  error(message: string, error?: Error | unknown): void;
  warn(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}

// Re-export MCP SDK types for convenience
export type { Tool, Resource, Prompt, CallToolResult, ReadResourceResult, GetPromptResult };

/**
 * Base server class for Neurix MCP servers
 * Provides common functionality for building MCP-compliant servers
 */
export abstract class NeurixBaseServer {
  protected server: Server;
  protected config: NeurixServerConfig;
  protected logger: Logger;

  constructor(config: NeurixServerConfig) {
    this.config = config;
    this.server = new Server(
      {
        name: config.name,
        version: config.version,
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.logger = this.createLogger();
    this.setupHandlers();
  }

  private createLogger(): Logger {
    return {
      info: (message: string, ...args: unknown[]) => {
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'info',
          service: this.config.name,
          message,
          ...(args.length > 0 ? { data: args } : {}),
        }));
      },
      error: (message: string, error?: Error | unknown) => {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          service: this.config.name,
          message,
          ...(error instanceof Error ? { error: error.message, stack: error.stack } : { error }),
        }));
      },
      warn: (message: string, ...args: unknown[]) => {
        console.warn(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'warn',
          service: this.config.name,
          message,
          ...(args.length > 0 ? { data: args } : {}),
        }));
      },
      debug: (message: string, ...args: unknown[]) => {
        if (process.env.DEBUG) {
          console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'debug',
            service: this.config.name,
            message,
            ...(args.length > 0 ? { data: args } : {}),
          }));
        }
      },
    };
  }

  private setupHandlers(): void {
    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = await this.listTools();
      return { tools };
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const result = await this.callTool(name, args || {});
      return result;
    });

    // List resources handler
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const resources = await this.listResources();
      return { resources };
    });

    // Read resource handler
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      const result = await this.readResource(uri);
      return result;
    });

    // List prompts handler
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      const prompts = await this.listPrompts();
      return { prompts };
    });

    // Get prompt handler
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const result = await this.getPrompt(name, args || {});
      return result;
    });
  }

  /**
   * Initialize the server - override to perform async initialization
   */
  async initialize(): Promise<void> {
    // Default implementation does nothing
    // Override in subclasses for custom initialization
  }

  /**
   * Start the server with STDIO transport
   */
  async run(): Promise<void> {
    await this.initialize();
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.logger.info('Server started with STDIO transport');
  }

  /**
   * Get the underlying MCP server instance
   */
  getServer(): Server {
    return this.server;
  }

  // Abstract methods to be implemented by subclasses

  /**
   * Return the list of tools this server provides
   */
  protected abstract listTools(): Promise<Tool[]>;

  /**
   * Handle a tool call
   */
  protected abstract callTool(name: string, args: Record<string, unknown>): Promise<CallToolResult>;

  /**
   * Return the list of resources this server provides
   */
  protected abstract listResources(): Promise<Resource[]>;

  /**
   * Read a resource by URI
   */
  protected abstract readResource(uri: string): Promise<ReadResourceResult>;

  /**
   * Return the list of prompts this server provides
   */
  protected abstract listPrompts(): Promise<Prompt[]>;

  /**
   * Get a prompt by name with arguments
   */
  protected abstract getPrompt(name: string, args: Record<string, unknown>): Promise<GetPromptResult>;
}

// Re-export useful types from MCP SDK
export { Server } from '@modelcontextprotocol/sdk/server/index.js';
export { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
