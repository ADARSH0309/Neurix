import { Redis } from 'ioredis';
import { randomBytes, createHash } from 'crypto';
import { getRedisClient } from '../../session/redis-client.js';

/**
 * OAuth 2.1 Authorization Code Manager with PKCE support
 */

export interface AuthorizationCode {
  code: string;
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: 'S256';
  state?: string;
  user_email: string;
  google_access_token: string;
  google_refresh_token?: string;
  created_at: number;
  expires_at: number;
}

export interface AuthorizationRequest {
  client_id: string;
  redirect_uri: string;
  state?: string;
  code_challenge: string;
  code_challenge_method: string;
  response_type: string;
}

export class AuthorizationCodeManager {
  private redis: Redis;
  private keyPrefix = 'gcal:oauth:authz_code:';
  private requestKeyPrefix = 'gcal:oauth:authz_request:';
  private codeExpirySeconds = 600;

  constructor() {
    this.redis = getRedisClient();
    this.redis.on('error', (err: Error) => {
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: 'error', message: 'Redis client error in AuthorizationCodeManager', error: err.message }));
    });
  }

  async initialize(): Promise<void> {
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', message: 'AuthorizationCodeManager initialized' }));
  }

  async storeAuthorizationRequest(sessionId: string, request: AuthorizationRequest): Promise<void> {
    const key = `${this.requestKeyPrefix}${sessionId}`;
    await this.redis.setex(key, this.codeExpirySeconds, JSON.stringify(request));
  }

  async getAuthorizationRequest(sessionId: string): Promise<AuthorizationRequest | null> {
    const key = `${this.requestKeyPrefix}${sessionId}`;
    const data = await this.redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as AuthorizationRequest;
  }

  async deleteAuthorizationRequest(sessionId: string): Promise<void> {
    const key = `${this.requestKeyPrefix}${sessionId}`;
    await this.redis.del(key);
  }

  async generateAuthorizationCode(
    client_id: string, redirect_uri: string, code_challenge: string, code_challenge_method: 'S256',
    user_email: string, google_access_token: string, google_refresh_token?: string, state?: string
  ): Promise<string> {
    const code = randomBytes(32).toString('base64url');
    const authzCode: AuthorizationCode = {
      code, client_id, redirect_uri, code_challenge, code_challenge_method, state,
      user_email, google_access_token, google_refresh_token,
      created_at: Date.now(), expires_at: Date.now() + this.codeExpirySeconds * 1000,
    };
    const key = `${this.keyPrefix}${code}`;
    await this.redis.setex(key, this.codeExpirySeconds, JSON.stringify(authzCode));
    return code;
  }

  async validateAndConsumeCode(code: string, client_id: string, redirect_uri: string, code_verifier: string): Promise<AuthorizationCode | null> {
    const key = `${this.keyPrefix}${code}`;
    const luaScript = `
      local key = KEYS[1]
      local data = redis.call('GET', key)
      if data then
        redis.call('DEL', key)
      end
      return data
    `;
    const data = await this.redis.eval(luaScript, 1, key) as string | null;
    if (!data) return null;

    const authzCode = JSON.parse(data) as AuthorizationCode;
    if (authzCode.expires_at < Date.now()) return null;
    if (authzCode.client_id !== client_id) return null;
    if (authzCode.redirect_uri !== redirect_uri) return null;
    if (!this.verifyCodeChallenge(code_verifier, authzCode.code_challenge)) return null;

    return authzCode;
  }

  private verifyCodeChallenge(code_verifier: string, code_challenge: string): boolean {
    const hash = createHash('sha256').update(code_verifier).digest('base64url');
    return hash === code_challenge;
  }
}

export const authorizationCodeManager = new AuthorizationCodeManager();
