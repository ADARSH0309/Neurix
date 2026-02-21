import { Redis } from 'ioredis';
import { randomBytes } from 'crypto';
import { getRedisClient } from '../../session/redis-client.js';

/**
 * Dynamic Client Registration Manager (RFC 7591)
 */

export interface RegisteredClient {
  client_id: string;
  client_secret?: string;
  client_name?: string;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  token_endpoint_auth_method: string;
  created_at: number;
}

export interface ClientRegistrationRequest {
  client_name?: string;
  redirect_uris?: string[];
  token_endpoint_auth_method?: string;
  grant_types?: string[];
  response_types?: string[];
}

export class ClientRegistrationManager {
  private redis: Redis;
  private keyPrefix = 'gmail:oauth:client:';
  private isConnected: boolean = false;

  constructor() {
    this.redis = getRedisClient();

    this.redis.on('error', (err: Error) => {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Redis client error in ClientRegistrationManager',
        error: err.message,
      }));
    });
  }

  async initialize(): Promise<void> {
    this.isConnected = true;
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'ClientRegistrationManager initialized',
    }));
  }

  async registerClient(request: ClientRegistrationRequest): Promise<RegisteredClient> {
    const client_id = `mcp_gmail_${randomBytes(16).toString('hex')}`;
    const token_endpoint_auth_method = request.token_endpoint_auth_method || 'none';
    const client_secret = token_endpoint_auth_method === 'none'
      ? undefined
      : randomBytes(32).toString('hex');

    const client: RegisteredClient = {
      client_id,
      client_secret,
      client_name: request.client_name || 'Dynamic Client',
      redirect_uris: request.redirect_uris || [],
      grant_types: request.grant_types || ['authorization_code'],
      response_types: request.response_types || ['code'],
      token_endpoint_auth_method,
      created_at: Date.now(),
    };

    const key = `${this.keyPrefix}${client_id}`;
    await this.redis.setex(key, 30 * 24 * 60 * 60, JSON.stringify(client));

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'OAuth client registered',
      client_id,
      client_name: client.client_name,
    }));

    return client;
  }

  async getClient(client_id: string): Promise<RegisteredClient | null> {
    const key = `${this.keyPrefix}${client_id}`;
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data) as RegisteredClient;
  }

  async validateRedirectUri(client_id: string, redirect_uri: string): Promise<boolean> {
    const client = await this.getClient(client_id);

    if (!client) {
      return false;
    }

    const isValid = client.redirect_uris.includes(redirect_uri);

    if (!isValid) {
      console.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: 'OAuth redirect URI validation failed',
        client_id,
        requested_uri: redirect_uri,
        registered_uris: client.redirect_uris,
      }));
    }

    return isValid;
  }

  async deleteClient(client_id: string): Promise<boolean> {
    const key = `${this.keyPrefix}${client_id}`;
    const result = await this.redis.del(key);

    return result > 0;
  }
}

export const clientRegistrationManager = new ClientRegistrationManager();
