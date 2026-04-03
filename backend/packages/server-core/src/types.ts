/**
 * Core interfaces for Neurix MCP server infrastructure.
 *
 * These interfaces allow the shared HTTP/OAuth/session code to work
 * with any Google service without importing service-specific modules.
 */

/**
 * OAuth token set stored in Redis sessions.
 */
export interface OAuthTokenSet {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

/**
 * A Google API client that can receive OAuth credentials.
 * Each service (Drive, Gmail, etc.) implements this.
 */
export interface ServiceClient {
  setCredentials(tokens: OAuthTokenSet): void;
}

/**
 * HTTP adapter that bridges JSON-RPC requests to MCP tool calls.
 * Each service provides its own implementation wrapping its ServiceClient.
 */
export interface McpAdapter {
  initialize(): Promise<any>;
  listTools(): Promise<any>;
  callTool(name: string, args: Record<string, unknown>): Promise<any>;
  listResources(): Promise<any>;
  readResource(uri: string): Promise<any>;
  listPrompts(): Promise<any>;
  getPrompt(name: string, args: Record<string, unknown>): Promise<any>;
}

/**
 * Factory functions provided by each service to create its specific
 * client and adapter instances. Passed to the shared HTTP infrastructure.
 */
export interface ServiceFactory {
  createClient(
    clientId: string,
    clientSecret: string,
    redirectUri: string,
  ): ServiceClient;

  createAdapter(client: ServiceClient): McpAdapter;
}

/**
 * Complete server definition. Each MCP server provides one of these
 * to the shared infrastructure to configure itself.
 */
export interface ServerDefinition {
  /** Short identifier, e.g. 'gdrive', 'gmail' */
  id: string;
  /** Human-readable name, e.g. 'Google Drive' */
  name: string;
  /** Display name for the server, e.g. 'Google Drive MCP Server' */
  displayName: string;
  /** Default port number */
  port: number;
  /** OAuth callback path segment, e.g. 'g-drive' → /auth/g-drive/callback */
  callbackPath: string;
  /** OAuth scopes required by this service */
  scopes: string[];
  /** Factory to create service-specific client and adapter */
  factory: ServiceFactory;
}

/**
 * OAuth configuration extracted from environment.
 */
export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}
