/**
 * Token Manager for Bearer Token Authentication
 */

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
    this.redisClient = getRedisClient();
    this.redisClient.on('error', (err: Error) => {
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
      const token = randomUUID();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + TOKEN_TTL * 1000);
      const tokenData: TokenData = {
        token, sessionId,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };
      const key = `${TOKEN_PREFIX}${token}`;
      const value = JSON.stringify(tokenData);
      const result = await this.redisClient.set(key, value, 'EX', TOKEN_TTL, 'NX');
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
      const data = await this.redisClient.get(`${TOKEN_PREFIX}${token}`);
      if (!data) return { valid: false, error: 'Token not found or expired' };

      const tokenData: TokenData = JSON.parse(data);
      const expiresAt = new Date(tokenData.expiresAt);
      if (expiresAt <= new Date()) {
        await this.revokeToken(token);
        return { valid: false, error: 'Token has expired' };
      }
      return { valid: true, sessionId: tokenData.sessionId };
    } catch (error) {
      return { valid: false, error: 'Token validation failed' };
    }
  }

  async revokeToken(token: string): Promise<boolean> {
    const result = await this.redisClient.del(`${TOKEN_PREFIX}${token}`);
    return result > 0;
  }

  async revokeTokensForSession(sessionId: string): Promise<number> {
    let revokedCount = 0;
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

  async close(): Promise<void> {
    if (this.isConnected) {
      await this.redisClient.quit();
    }
  }
}

export const tokenManager = new TokenManager();
