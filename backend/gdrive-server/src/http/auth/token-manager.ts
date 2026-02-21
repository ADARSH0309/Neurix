/**
 * Token Manager for Bearer Token Authentication
 */

import { Redis } from 'ioredis';
import { randomUUID } from 'crypto';
import { getRedisClient } from '../../session/redis-client.js';
import { scanKeys } from '../../utils/redis-helpers.js';

const TOKEN_TTL = 24 * 60 * 60; // 24 hours in seconds
const TOKEN_PREFIX = 'gdrive-api-token:';

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
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: 'Redis client error in TokenManager',
          error: err.message,
        })
      );
    });
  }

  async initialize(): Promise<void> {
    this.isConnected = this.redisClient.status === 'ready';

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'TokenManager initialized',
        redisStatus: this.redisClient.status,
      })
    );
  }

  /**
   * Generate a new bearer token for a session with atomic SET NX
   */
  async generateToken(sessionId: string): Promise<string> {
    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const token = randomUUID();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + TOKEN_TTL * 1000);

      const tokenData: TokenData = {
        token,
        sessionId,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };

      const key = `${TOKEN_PREFIX}${token}`;
      const value = JSON.stringify(tokenData);

      const result = await this.redisClient.set(key, value, 'EX', TOKEN_TTL, 'NX');

      if (result === 'OK') {
        console.log(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'API token generated',
            token: token.substring(0, 8) + '...',
            sessionId,
            expiresAt: expiresAt.toISOString(),
            attempt: attempt + 1,
          })
        );

        return token;
      }

      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'warn',
          message: 'Token collision detected, retrying',
          token: token.substring(0, 8) + '...',
          sessionId,
          attempt: attempt + 1,
        })
      );
    }

    const error = new Error('Failed to generate unique token after retries');
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Token generation failed after all retries',
        sessionId,
        maxRetries,
      })
    );
    throw error;
  }

  async validateToken(token: string): Promise<TokenValidationResult> {
    try {
      const data = await this.redisClient.get(`${TOKEN_PREFIX}${token}`);

      if (!data) {
        return {
          valid: false,
          error: 'Token not found or expired',
        };
      }

      const tokenData: TokenData = JSON.parse(data);

      const expiresAt = new Date(tokenData.expiresAt);
      if (expiresAt <= new Date()) {
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'security',
          event: 'token_revoked',
          sessionId: tokenData.sessionId,
          reason: 'expired',
          token_preview: token.substring(0, 8) + '...',
        }));

        await this.revokeToken(token);
        return {
          valid: false,
          error: 'Token has expired',
        };
      }

      return {
        valid: true,
        sessionId: tokenData.sessionId,
      };
    } catch (error) {
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: 'Token validation failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      );

      return {
        valid: false,
        error: 'Token validation failed',
      };
    }
  }

  async revokeToken(token: string): Promise<boolean> {
    const tokenData = await this.getTokenData(token);
    const result = await this.redisClient.del(`${TOKEN_PREFIX}${token}`);

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'API token revoked',
        token: token.substring(0, 8) + '...',
        success: result > 0,
      })
    );

    if (result > 0) {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'security',
        event: 'token_revoked',
        sessionId: tokenData?.sessionId,
        reason: 'manual_revocation',
        token_preview: token.substring(0, 8) + '...',
      }));
    }

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
        } catch (error) {
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'error',
            message: 'Failed to revoke token',
            key,
            error: error instanceof Error ? error.message : 'Unknown',
          }));
        }
      }
    });

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Session tokens revoked',
        sessionId,
        count: revokedCount,
      })
    );

    if (revokedCount > 0) {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'security',
        event: 'token_revoked',
        sessionId,
        reason: 'session_revocation',
        tokens_revoked: revokedCount,
      }));
    }

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
            if (tokenData.sessionId === sessionId) {
              tokens.push(tokenData);
            }
          }
        } catch (error) {
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'warn',
            message: 'Failed to get token during scan',
            key,
            error: error instanceof Error ? error.message : 'Unknown',
          }));
        }
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
            const expiresAt = new Date(tokenData.expiresAt);

            if (expiresAt <= now) {
              await this.redisClient.del(key);
              cleanedCount++;
            }
          }
        } catch (error) {
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'error',
            message: 'Failed to cleanup token',
            key,
            error: error instanceof Error ? error.message : 'Unknown',
          }));
        }
      }
    });

    if (cleanedCount > 0) {
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Expired tokens cleaned up',
          count: cleanedCount,
        })
      );
    }

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
