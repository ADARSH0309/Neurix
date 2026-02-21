/**
 * Token Manager for Bearer Token Authentication
 *
 * Manages API tokens for MCP Inspector compatibility.
 * Tokens are stored in Redis with 24-hour TTL and associated with session IDs.
 */

import { Redis } from 'ioredis';
import { randomUUID } from 'crypto';
import { getRedisClient } from '../../session/redis-client.js';
import { scanKeys } from '../../utils/redis-helpers.js';

const TOKEN_TTL = 24 * 60 * 60; // 24 hours in seconds
const TOKEN_PREFIX = 'api-token:';

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
    // Use the shared Redis client from session manager
    this.redisClient = getRedisClient();

    // Error handling
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

  /**
   * Initialize the token manager (redis is already initialized via getRedisClient)
   */
  async initialize(): Promise<void> {
    // Redis client is already initialized via getRedisClient()
    // Just verify connection status
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
   * Generate a new bearer token for a session
   *
   * CRITICAL-008 Fix: Uses SET NX (only if not exists) with automatic retry
   * to prevent race condition where two concurrent requests could theoretically
   * generate the same token (astronomically unlikely with UUID v4, but this
   * guarantees atomicity).
   *
   * Implementation:
   * 1. Generate cryptographically secure UUID token
   * 2. Try to SET NX (only if key doesn't exist) with TTL
   * 3. If SET NX fails (key already exists), retry with new token
   * 4. Retry up to 3 times before throwing error
   *
   * @param sessionId - The session ID to associate with the token
   * @returns The generated token string
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

      // CRITICAL-008 Fix: Use SET NX (only if not exists) with TTL
      // 'NX' option: only set if key doesn't exist
      // 'EX' option: set expiry in seconds
      // Returns 'OK' if successful, null if key already exists
      const result = await this.redisClient.set(key, value, 'EX', TOKEN_TTL, 'NX');

      if (result === 'OK') {
        // Success! Token was set atomically
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

      // Token collision detected (extremely unlikely), retry
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

    // Should be astronomically unlikely to reach here
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

  /**
   * Validate a bearer token and return associated session ID
   *
   * @param token - The token to validate
   * @returns Validation result with session ID if valid
   */
  async validateToken(token: string): Promise<TokenValidationResult> {
    try {
      // Retrieve from Redis
      const data = await this.redisClient.get(`${TOKEN_PREFIX}${token}`);

      if (!data) {
        return {
          valid: false,
          error: 'Token not found or expired',
        };
      }

      const tokenData: TokenData = JSON.parse(data);

      // Check expiration (redundant with Redis TTL, but good practice)
      const expiresAt = new Date(tokenData.expiresAt);
      if (expiresAt <= new Date()) {
        // Phase 5.1 - Week 2, Task 2.2: Security Audit Logging (Issue #7)
        // Security audit log for expired token (before cleanup)
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'security',
          event: 'token_revoked',
          sessionId: tokenData.sessionId,
          reason: 'expired',
          token_preview: token.substring(0, 8) + '...',
        }));

        await this.revokeToken(token); // Clean up expired token
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

  /**
   * Revoke a token (delete from Redis)
   *
   * @param token - The token to revoke
   * @returns True if token was revoked, false if not found
   */
  async revokeToken(token: string): Promise<boolean> {
    // Get token data before deletion for audit logging
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

    // Phase 5.1 - Week 2, Task 2.2: Security Audit Logging (Issue #7)
    // Security audit log for token revocation
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

  /**
   * Revoke all tokens for a session
   *
   * @param sessionId - The session ID
   * @returns Number of tokens revoked
   */
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

    // Phase 5.1 - Week 2, Task 2.2: Security Audit Logging (Issue #7)
    // Security audit log for session token revocation
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

  /**
   * Get token data (for display/debugging)
   *
   * @param token - The token to retrieve
   * @returns Token data or null if not found
   */
  async getTokenData(token: string): Promise<TokenData | null> {
    const data = await this.redisClient.get(`${TOKEN_PREFIX}${token}`);
    return data ? JSON.parse(data) : null;
  }

  /**
   * List all tokens for a session (for debugging/admin)
   *
   * @param sessionId - The session ID
   * @returns Array of token data
   */
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

  /**
   * Clean up expired tokens (called periodically)
   * Note: Redis TTL handles this automatically, but this can be used for manual cleanup
   */
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

  /**
   * Get total number of active tokens
   */
  async getTokenCount(): Promise<number> {
    let count = 0;

    await scanKeys(this.redisClient, `${TOKEN_PREFIX}*`, async (keys) => {
      count += keys.length;
    });

    return count;
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.isConnected) {
      await this.redisClient.quit();
    }
  }
}

// Singleton instance
export const tokenManager = new TokenManager();
