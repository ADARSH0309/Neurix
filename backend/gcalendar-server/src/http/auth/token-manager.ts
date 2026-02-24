/**
 * Token Manager for Bearer Token Authentication
 */


//bearer token is random string like a3f8b2c1-9d4e-4f6a-b8c7-2e1d3f5a9b0c. Whoever (carries) considered authenticated

import { Redis } from 'ioredis';
import { randomUUID } from 'crypto';
import { getRedisClient } from '../../session/redis-client.js';
import { scanKeys } from '../../utils/redis-helpers.js';

const TOKEN_TTL = 24 * 60 * 60; // 24 hours in seconds
const TOKEN_PREFIX = 'gcal-api-token:';

export interface TokenData {
  token: string;
  sessionId: string;
  createdAt: string;
  expiresAt: string;
}

export interface TokenValidationResult {
  valid: boolean;
  sessionId?: string;
  error?: string;
}

export class TokenManager {
  private redisClient: Redis;
  private isConnected: boolean = false;

  constructor() {
    this.redisClient = getRedisClient();            //get connection with redis
    this.redisClient.on('error', (err: Error) => {  // if redis have problem then log it
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Redis client error in TokenManager',
        error: err.message,
      }));
    });
  }

  async initialize(): Promise<void> {
    
    this.isConnected = this.redisClient.status === 'ready';
    // log that we are ready
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'TokenManager initialized',
      redisStatus: this.redisClient.status,
    }));
  }

  async generateToken(sessionId: string): Promise<string> {
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // step 1: generate random token
      const token = randomUUID();

      // step 2: calculate expiry time(now + 24 hours)
      const now = new Date();
      const expiresAt = new Date(now.getTime() + TOKEN_TTL * 1000);

      // step 3: package the token info
      const tokenData: TokenData = {
        token, sessionId,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };

      // step 4: store in redis with a key trick
      const key = `${TOKEN_PREFIX}${token}`;
      const value = JSON.stringify(tokenData);
      const result = await this.redisClient.set(key, value, 'EX', TOKEN_TTL, 'NX');

      // step 5: if it worked, return the token
      if (result === 'OK') {
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'API token generated',
          token: token.substring(0, 8) + '...',
          sessionId,
          expiresAt: expiresAt.toISOString(),
        }));
        return token;
      }
    }
    throw new Error('Failed to generate unique token after retries');
  }

  async validateToken(token: string): Promise<TokenValidationResult> {
    try {

      // step 1: look up the token in redis
      const data = await this.redisClient.get(`${TOKEN_PREFIX}${token}`);

      // if not found, it's invalid
      if (!data) return { valid: false, error: 'Token not found or expired' };

      // step 2: parse the stored data
      const tokenData: TokenData = JSON.parse(data);      
      const expiresAt = new Date(tokenData.expiresAt);
      
      // Step 3: Double-check the expiry (belt and suspenders)
      if (expiresAt <= new Date()) {
        await this.revokeToken(token);
        return { valid: false, error: 'Token has expired' };
      }
      
      // step 4: token is valid! return which session it belongs to
      return { valid: true, sessionId: tokenData.sessionId };
    } catch (error) {
      return { valid: false, error: 'Token validation failed' };
    }
  }

  // revoke(delete) a single token (e.g. user logs out from one device)
  async revokeToken(token: string): Promise<boolean> {
    const result = await this.redisClient.del(`${TOKEN_PREFIX}${token}`);
    return result > 0;
  }

  // revoke all tokens for a session (e.g. user logs out from all devices)
  async revokeTokensForSession(sessionId: string): Promise<number> {
    let revokedCount = 0;

    // scan all tokens in redis 
    await scanKeys(this.redisClient, `${TOKEN_PREFIX}*`, async (keys) => {
      for (const key of keys) {
        try {
          const data = await this.redisClient.get(key);
          if (data) {
            const tokenData: TokenData = JSON.parse(data);
            if (tokenData.sessionId === sessionId) {
              await this.redisClient.del(key);
              revokedCount++;
            }
          }
        } catch (error) { /* skip */ }
      }
    });
    return revokedCount;
  }

  async getTokenData(token: string): Promise<TokenData | null> {
    const data = await this.redisClient.get(`${TOKEN_PREFIX}${token}`);
    return data ? JSON.parse(data) : null;
  }

  async listTokensForSession(sessionId: string): Promise<TokenData[]> {
    const tokens: TokenData[] = [];
    await scanKeys(this.redisClient, `${TOKEN_PREFIX}*`, async (keys) => {
      for (const key of keys) {
        try {
          const data = await this.redisClient.get(key);
          if (data) {
            const tokenData: TokenData = JSON.parse(data);
            if (tokenData.sessionId === sessionId) tokens.push(tokenData);
          }
        } catch (error) { /* skip */ }
      }
    });
    return tokens;
  }

  async cleanupExpiredTokens(): Promise<number> {
    let cleanedCount = 0;
    const now = new Date();
    await scanKeys(this.redisClient, `${TOKEN_PREFIX}*`, async (keys) => {
      for (const key of keys) {
        try {
          const data = await this.redisClient.get(key);
          if (data) {
            const tokenData: TokenData = JSON.parse(data);
            if (new Date(tokenData.expiresAt) <= now) {
              await this.redisClient.del(key);
              cleanedCount++;
            }
          }
        } catch (error) { /* skip */ }
      }
    });
    return cleanedCount;
  }

  async getTokenCount(): Promise<number> {
    let count = 0;
    await scanKeys(this.redisClient, `${TOKEN_PREFIX}*`, async (keys) => {
      count += keys.length;
    });
    return count;
  }

  // disconnect from redis when shutting down the server
  async close(): Promise<void> {
    if (this.isConnected) {
      await this.redisClient.quit();
    }
  }
}

export const tokenManager = new TokenManager();
