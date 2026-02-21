import { Redis } from 'ioredis';
import { randomBytes, createHash } from 'crypto';
import { getRedisClient } from '../../session/redis-client.js';

/**
 * OAuth 2.1 Authorization Code Manager with PKCE support
 * Manages authorization codes for the authorization code flow
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
  private keyPrefix = 'oauth:authz_code:';
  private requestKeyPrefix = 'oauth:authz_request:';
  private codeExpirySeconds = 600; // 10 minutes per OAuth 2.1 spec

  constructor() {
    this.redis = getRedisClient();

    this.redis.on('error', (err: Error) => {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Redis client error in AuthorizationCodeManager',
        error: err.message,
      }));
    });
  }

  async initialize(): Promise<void> {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'AuthorizationCodeManager initialized',
    }));
  }

  /**
   * Store authorization request for the OAuth flow
   * This is stored temporarily while the user goes through Google OAuth
   */
  async storeAuthorizationRequest(
    sessionId: string,
    request: AuthorizationRequest
  ): Promise<void> {
    const key = `${this.requestKeyPrefix}${sessionId}`;
    await this.redis.setex(key, this.codeExpirySeconds, JSON.stringify(request));

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Authorization request stored',
      sessionId,
      client_id: request.client_id,
    }));
  }

  /**
   * Retrieve authorization request from session
   */
  async getAuthorizationRequest(sessionId: string): Promise<AuthorizationRequest | null> {
    const key = `${this.requestKeyPrefix}${sessionId}`;
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data) as AuthorizationRequest;
  }

  /**
   * Delete authorization request after use
   */
  async deleteAuthorizationRequest(sessionId: string): Promise<void> {
    const key = `${this.requestKeyPrefix}${sessionId}`;
    await this.redis.del(key);
  }

  /**
   * Generate authorization code after successful authentication
   */
  async generateAuthorizationCode(
    client_id: string,
    redirect_uri: string,
    code_challenge: string,
    code_challenge_method: 'S256',
    user_email: string,
    google_access_token: string,
    google_refresh_token?: string,
    state?: string
  ): Promise<string> {
    // Generate secure random code
    const code = randomBytes(32).toString('base64url');

    const authzCode: AuthorizationCode = {
      code,
      client_id,
      redirect_uri,
      code_challenge,
      code_challenge_method,
      state,
      user_email,
      google_access_token,
      google_refresh_token,
      created_at: Date.now(),
      expires_at: Date.now() + this.codeExpirySeconds * 1000,
    };

    // Store in Redis with expiry
    const key = `${this.keyPrefix}${code}`;
    await this.redis.setex(key, this.codeExpirySeconds, JSON.stringify(authzCode));

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Authorization code generated',
      client_id,
      user_email,
      code_length: code.length,
    }));

    // Phase 5.1 - Week 2, Task 2.2: Security Audit Logging (Issue #7)
    // Security audit log for authorization code generation
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'security',
      event: 'authorization_code_generated',
      client_id,
      userEmail: user_email,
      redirect_uri,
      code_hash: createHash('sha256').update(code).digest('hex').substring(0, 16),
      expires_at: authzCode.expires_at,
    }));

    return code;
  }

  /**
   * Validate and consume authorization code (one-time use)
   *
   * CRITICAL-009 Fix: Uses atomic Lua script for GET+DEL to prevent race condition
   * where two concurrent requests could both GET the same code before either DEL executes.
   *
   * OAuth 2.1 Security: Authorization codes MUST be single-use only.
   * This atomic operation ensures only one request can successfully consume a code,
   * even under high concurrency.
   *
   * Implementation:
   * 1. Atomically GET and DEL the code using Lua script (prevents race condition)
   * 2. If code not found, return null (already consumed or never existed)
   * 3. Validate the code after consumption
   * 4. If validation fails, code remains consumed (can't be replayed)
   */
  async validateAndConsumeCode(
    code: string,
    client_id: string,
    redirect_uri: string,
    code_verifier: string
  ): Promise<AuthorizationCode | null> {
    const key = `${this.keyPrefix}${code}`;

    // CRITICAL-009 Fix: Atomic GET+DEL using Lua script
    // This prevents race condition where two requests could both GET before either DEL
    const luaScript = `
      local key = KEYS[1]
      local data = redis.call('GET', key)
      if data then
        redis.call('DEL', key)
      end
      return data
    `;

    // Execute Lua script atomically on Redis server
    // Only ONE concurrent request will successfully retrieve the code
    const data = await this.redis.eval(luaScript, 1, key) as string | null;

    if (!data) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Authorization code not found or already consumed',
        code_length: code.length,
      }));
      return null;
    }

    // Parse authorization code data
    const authzCode = JSON.parse(data) as AuthorizationCode;

    // Verify expiry
    if (authzCode.expires_at < Date.now()) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Authorization code expired',
        client_id: authzCode.client_id,
      }));
      return null;
    }

    // Verify client_id matches
    if (authzCode.client_id !== client_id) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Client ID mismatch',
        expected: authzCode.client_id,
        received: client_id,
      }));
      return null;
    }

    // Verify redirect_uri matches
    if (authzCode.redirect_uri !== redirect_uri) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Redirect URI mismatch',
        expected: authzCode.redirect_uri,
        received: redirect_uri,
      }));
      return null;
    }

    // Verify PKCE code_verifier
    if (!this.verifyCodeChallenge(code_verifier, authzCode.code_challenge)) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'PKCE code_verifier validation failed',
        client_id,
      }));
      return null;
    }

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Authorization code validated and consumed',
      client_id,
      user_email: authzCode.user_email,
    }));

    return authzCode;
  }

  /**
   * Verify PKCE code_verifier matches code_challenge
   * code_challenge = BASE64URL(SHA256(code_verifier))
   */
  private verifyCodeChallenge(code_verifier: string, code_challenge: string): boolean {
    const hash = createHash('sha256')
      .update(code_verifier)
      .digest('base64url');

    return hash === code_challenge;
  }
}

// Singleton instance
export const authorizationCodeManager = new AuthorizationCodeManager();
