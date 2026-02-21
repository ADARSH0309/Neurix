/**
 * Session Manager with Dual Timeout Strategy
 *
 * Implements secure session management with:
 * - Absolute timeout (maximum session lifetime)
 * - Idle timeout (inactivity timeout)
 * - Token refresh handling
 * - Redis-based distributed sessions
 */

import { Redis } from 'ioredis';
import { logger } from '../lib/logger.js';
import { activeSessions, sessionEvents } from '../lib/metrics.js';

export interface OAuthTokens {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

export interface Session {
  id: string;
  userId: string;
  userEmail: string;
  tokens: OAuthTokens;
  createdAt: number;
  lastAccessedAt: number;
  expiresAt: number;
  metadata?: Record<string, unknown>;
}

export interface SessionManagerOptions {
  /** Redis connection URL */
  redisUrl?: string;
  /** Absolute timeout in ms (default: 4 hours) */
  absoluteTimeout?: number;
  /** Idle timeout in ms (default: 30 minutes) */
  idleTimeout?: number;
  /** Token refresh buffer in ms (default: 5 minutes) */
  tokenRefreshBuffer?: number;
  /** Session key prefix */
  keyPrefix?: string;
}

const DEFAULT_OPTIONS = {
  absoluteTimeout: 4 * 60 * 60 * 1000,      // 4 hours
  idleTimeout: 30 * 60 * 1000,               // 30 minutes
  tokenRefreshBuffer: 5 * 60 * 1000,         // 5 minutes
  keyPrefix: 'gmail:session:',
};

export class SessionManager {
  private redis: Redis | null = null;
  private readonly absoluteTimeout: number;
  private readonly idleTimeout: number;
  private readonly tokenRefreshBuffer: number;
  private readonly keyPrefix: string;

  // In-memory fallback when Redis is not available
  private localSessions: Map<string, Session> = new Map();

  constructor(options: SessionManagerOptions = {}) {
    this.absoluteTimeout = options.absoluteTimeout || DEFAULT_OPTIONS.absoluteTimeout;
    this.idleTimeout = options.idleTimeout || DEFAULT_OPTIONS.idleTimeout;
    this.tokenRefreshBuffer = options.tokenRefreshBuffer || DEFAULT_OPTIONS.tokenRefreshBuffer;
    this.keyPrefix = options.keyPrefix || DEFAULT_OPTIONS.keyPrefix;

    // Initialize Redis if URL provided
    if (options.redisUrl) {
      this.initRedis(options.redisUrl);
    }
  }

  private initRedis(url: string): void {
    try {
      const redis = new Redis(url, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => {
          if (times > 10) return null;
          return Math.min(times * 100, 3000);
        },
        lazyConnect: false,
      });

      redis.on('connect', () => {
        logger.info('Redis connected for session management');
      });

      redis.on('error', (error: Error) => {
        logger.error('Redis error', { error });
      });

      this.redis = redis;
    } catch (error) {
      logger.warn('Failed to connect to Redis, using in-memory sessions', { error });
      this.redis = null;
    }
  }

  /**
   * Create a new session
   */
  async createSession(params: {
    userId: string;
    userEmail: string;
    tokens: OAuthTokens;
    metadata?: Record<string, unknown>;
  }): Promise<Session> {
    const now = Date.now();
    const session: Session = {
      id: this.generateSessionId(),
      userId: params.userId,
      userEmail: params.userEmail,
      tokens: params.tokens,
      createdAt: now,
      lastAccessedAt: now,
      expiresAt: now + this.absoluteTimeout,
      metadata: params.metadata,
    };

    await this.saveSession(session);

    sessionEvents.inc({ event: 'created' });
    activeSessions.inc();

    logger.info('Session created', {
      sessionId: session.id,
      userId: params.userId,
      userEmail: params.userEmail,
    });

    return session;
  }

  /**
   * Get and validate a session
   */
  async getSession(sessionId: string): Promise<Session | null> {
    const session = await this.loadSession(sessionId);
    if (!session) return null;

    const now = Date.now();

    // Check absolute timeout (max session lifetime)
    if (now > session.expiresAt) {
      logger.info('Session expired (absolute timeout)', { sessionId });
      await this.destroySession(sessionId);
      sessionEvents.inc({ event: 'expired' });
      return null;
    }

    // Check idle timeout (inactivity)
    if (now - session.lastAccessedAt > this.idleTimeout) {
      logger.info('Session expired (idle timeout)', {
        sessionId,
        idleTime: now - session.lastAccessedAt,
      });
      await this.destroySession(sessionId);
      sessionEvents.inc({ event: 'expired' });
      return null;
    }

    // Update last accessed time (sliding window)
    session.lastAccessedAt = now;
    await this.saveSession(session);

    return session;
  }

  /**
   * Check if tokens need refresh
   */
  needsTokenRefresh(session: Session): boolean {
    const now = Date.now();
    return now >= session.tokens.expiry_date - this.tokenRefreshBuffer;
  }

  /**
   * Update session tokens after refresh
   */
  async updateTokens(sessionId: string, tokens: OAuthTokens): Promise<Session | null> {
    const session = await this.loadSession(sessionId);
    if (!session) return null;

    session.tokens = tokens;
    session.lastAccessedAt = Date.now();
    await this.saveSession(session);

    sessionEvents.inc({ event: 'refreshed' });

    logger.info('Session tokens refreshed', { sessionId });

    return session;
  }

  /**
   * Destroy a session
   */
  async destroySession(sessionId: string): Promise<boolean> {
    const key = this.keyPrefix + sessionId;

    if (this.redis) {
      await this.redis.del(key);
    } else {
      this.localSessions.delete(sessionId);
    }

    activeSessions.dec();
    sessionEvents.inc({ event: 'destroyed' });

    logger.info('Session destroyed', { sessionId });

    return true;
  }

  /**
   * Get session by user email
   */
  async getSessionByEmail(email: string): Promise<Session | null> {
    if (this.redis) {
      const keys = await this.redis.keys(`${this.keyPrefix}*`);
      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const session = JSON.parse(data) as Session;
          if (session.userEmail === email) {
            return this.getSession(session.id);
          }
        }
      }
    } else {
      for (const session of this.localSessions.values()) {
        if (session.userEmail === email) {
          return this.getSession(session.id);
        }
      }
    }
    return null;
  }

  /**
   * Cleanup expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    let cleaned = 0;
    const now = Date.now();

    if (this.redis) {
      const keys = await this.redis.keys(`${this.keyPrefix}*`);
      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const session = JSON.parse(data) as Session;
          const isExpired =
            now > session.expiresAt ||
            now - session.lastAccessedAt > this.idleTimeout;

          if (isExpired) {
            await this.redis.del(key);
            cleaned++;
          }
        }
      }
    } else {
      for (const [id, session] of this.localSessions.entries()) {
        const isExpired =
          now > session.expiresAt ||
          now - session.lastAccessedAt > this.idleTimeout;

        if (isExpired) {
          this.localSessions.delete(id);
          cleaned++;
        }
      }
    }

    if (cleaned > 0) {
      logger.info('Cleaned up expired sessions', { count: cleaned });
      activeSessions.set(await this.getActiveSessionCount());
    }

    return cleaned;
  }

  /**
   * Get active session count
   */
  async getActiveSessionCount(): Promise<number> {
    if (this.redis) {
      const keys = await this.redis.keys(`${this.keyPrefix}*`);
      return keys.length;
    }
    return this.localSessions.size;
  }

  // -------------------------------------------------------------------------
  // Private Methods
  // -------------------------------------------------------------------------

  private generateSessionId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 32; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }

  private async saveSession(session: Session): Promise<void> {
    const key = this.keyPrefix + session.id;
    const data = JSON.stringify(session);
    const ttl = Math.ceil(this.absoluteTimeout / 1000);

    if (this.redis) {
      await this.redis.setex(key, ttl, data);
    } else {
      this.localSessions.set(session.id, session);
    }
  }

  private async loadSession(sessionId: string): Promise<Session | null> {
    const key = this.keyPrefix + sessionId;

    if (this.redis) {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    }

    return this.localSessions.get(sessionId) || null;
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

// Export singleton instance
export const sessionManager = new SessionManager({
  redisUrl: process.env.REDIS_URL,
});
