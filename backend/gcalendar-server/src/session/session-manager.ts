import { randomUUID } from 'crypto';
import { getRedisClient } from './redis-client.js';
import type { Session, OAuthTokens, SessionCreateOptions, SessionManager as ISessionManager } from './types.js';
import { scanKeys } from '../utils/redis-helpers.js';
import { encryptTokens, decryptTokens } from '../utils/encryption.js';

/**
 * Redis-backed Session Manager with Encrypted Token Storage
 */

const SESSION_KEY_PREFIX = 'sess:';

const SESSION_TIMEOUTS = {
  ABSOLUTE: 4 * 60 * 60 * 1000,
  IDLE: 30 * 60 * 1000,
  REFRESH_TOKEN: 7 * 24 * 60 * 60 * 1000,
};

const DEFAULT_SESSION_TTL = SESSION_TIMEOUTS.ABSOLUTE;

interface StoredSession extends Omit<Session, 'tokens'> {
  encryptedTokens?: string;
}

export class SessionManager implements ISessionManager {
  private redis = getRedisClient();

  private async encryptSessionTokens(session: Session): Promise<StoredSession> {
    if (!session.tokens) {
      return session as StoredSession;
    }

    const { tokens, ...rest } = session;
    const encryptedTokens = await encryptTokens(tokens);

    return {
      ...rest,
      encryptedTokens,
    };
  }

  private async decryptSessionTokens(storedSession: StoredSession): Promise<Session> {
    if (!storedSession.encryptedTokens) {
      return storedSession as Session;
    }

    const { encryptedTokens, ...rest } = storedSession;

    try {
      const tokens = await decryptTokens(encryptedTokens);

      return {
        ...rest,
        tokens,
      };
    } catch (error) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Failed to decrypt session tokens',
        sessionId: storedSession.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));

      return rest as Session;
    }
  }

  async createSession(options?: SessionCreateOptions): Promise<Session> {
    const sessionId = randomUUID();
    const now = Date.now();
    const ttl = options?.ttl || DEFAULT_SESSION_TTL;

    const session: Session = {
      id: sessionId,
      createdAt: now,
      expiresAt: now + ttl,
      lastAccessedAt: now,
      authenticated: false,
      metadata: options?.metadata,
    };

    const key = `${SESSION_KEY_PREFIX}${sessionId}`;
    const ttlSeconds = Math.floor(ttl / 1000);
    const storedSession = await this.encryptSessionTokens(session);

    await this.redis.setex(key, ttlSeconds, JSON.stringify(storedSession));

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Session created',
      sessionId,
      expiresAt: new Date(session.expiresAt).toISOString(),
    }));

    return session;
  }

  async getSession(sessionId: string): Promise<Session | null> {
    const key = `${SESSION_KEY_PREFIX}${sessionId}`;
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    try {
      const storedSession = JSON.parse(data) as StoredSession;
      const session = await this.decryptSessionTokens(storedSession);
      const now = Date.now();

      if (session.expiresAt < now) {
        await this.deleteSession(sessionId);
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Session expired (absolute timeout)',
          sessionId,
          expiresAt: new Date(session.expiresAt).toISOString(),
          reason: 'ABSOLUTE_TIMEOUT',
        }));
        return null;
      }

      const idleTime = now - session.lastAccessedAt;
      if (idleTime > SESSION_TIMEOUTS.IDLE) {
        await this.deleteSession(sessionId);
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Session expired (idle timeout)',
          sessionId,
          lastAccessedAt: new Date(session.lastAccessedAt).toISOString(),
          idleMinutes: Math.floor(idleTime / 60000),
          reason: 'IDLE_TIMEOUT',
        }));
        return null;
      }

      session.lastAccessedAt = now;
      const updatedStoredSession = await this.encryptSessionTokens(session);
      const ttl = await this.redis.ttl(key);
      if (ttl > 0) {
        await this.redis.setex(key, ttl, JSON.stringify(updatedStoredSession));
      } else {
        await this.redis.setex(key, Math.floor(DEFAULT_SESSION_TTL / 1000), JSON.stringify(updatedStoredSession));
      }

      return session;
    } catch (error) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Failed to parse session data',
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
      return null;
    }
  }

  async updateSession(sessionId: string, updates: Partial<Session>): Promise<Session | null> {
    const key = `${SESSION_KEY_PREFIX}${sessionId}`;
    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await this.redis.watch(key);

        const data = await this.redis.get(key);
        if (!data) {
          await this.redis.unwatch();
          return null;
        }

        const storedSession = JSON.parse(data) as StoredSession;
        const session = await this.decryptSessionTokens(storedSession);

        const now = Date.now();
        if (session.expiresAt < now) {
          await this.redis.unwatch();
          await this.deleteSession(sessionId);
          return null;
        }

        const idleTime = now - session.lastAccessedAt;
        if (idleTime > SESSION_TIMEOUTS.IDLE) {
          await this.redis.unwatch();
          await this.deleteSession(sessionId);
          return null;
        }

        const updatedSession: Session = {
          ...session,
          ...updates,
          id: session.id,
          lastAccessedAt: now,
        };

        const storedUpdatedSession = await this.encryptSessionTokens(updatedSession);
        const serialized = JSON.stringify(storedUpdatedSession);

        const currentTtl = await this.redis.ttl(key);
        const ttlToUse = currentTtl > 0 ? currentTtl : Math.floor(DEFAULT_SESSION_TTL / 1000);

        const result = await this.redis
          .multi()
          .setex(key, ttlToUse, serialized)
          .exec();

        if (result === null) {
          continue;
        }

        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Session updated',
          sessionId,
          updates: Object.keys(updates),
          attempt: attempt + 1,
        }));

        return updatedSession;
      } catch (error) {
        await this.redis.unwatch().catch(() => {});

        if (attempt === maxRetries - 1) {
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'error',
            message: 'Failed to update session after retries',
            sessionId,
            attempts: maxRetries,
            error: error instanceof Error ? error.message : 'Unknown error',
          }));
          throw error;
        }
      }
    }

    return null;
  }

  async storeTokens(
    sessionId: string,
    tokens: OAuthTokens,
    userEmail?: string
  ): Promise<Session | null> {
    const updates: Partial<Session> = {
      tokens,
      authenticated: true,
    };

    if (userEmail) {
      updates.userEmail = userEmail;
    }

    const session = await this.updateSession(sessionId, updates);

    if (session) {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'OAuth tokens stored in session',
        sessionId,
        userEmail: userEmail || 'unknown',
      }));
    }

    return session;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const key = `${SESSION_KEY_PREFIX}${sessionId}`;
    const result = await this.redis.del(key);

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Session deleted',
      sessionId,
      existed: result > 0,
    }));

    return result > 0;
  }

  async cleanupExpiredSessions(): Promise<number> {
    const pattern = `${SESSION_KEY_PREFIX}*`;
    const now = Date.now();
    let deletedCount = 0;

    await scanKeys(this.redis, pattern, async (keys) => {
      for (const key of keys) {
        try {
          const data = await this.redis.get(key);
          if (!data) continue;

          try {
            const storedSession = JSON.parse(data) as StoredSession;
            if (storedSession.expiresAt < now) {
              await this.redis.del(key);
              deletedCount++;
            }
          } catch (parseError) {
            await this.redis.del(key);
            deletedCount++;
          }
        } catch (error) {
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'error',
            message: 'Failed to cleanup session',
            key,
            error: error instanceof Error ? error.message : 'Unknown',
          }));
        }
      }
    });

    if (deletedCount > 0) {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Expired sessions cleaned up',
        deletedCount,
      }));
    }

    return deletedCount;
  }

  async refreshSession(sessionId: string): Promise<Session | null> {
    const session = await this.getSession(sessionId);

    if (!session) {
      return null;
    }

    const now = Date.now();
    const newExpiresAt = now + DEFAULT_SESSION_TTL;

    const updatedSession: Session = {
      ...session,
      expiresAt: newExpiresAt,
      lastAccessedAt: now,
    };

    const key = `${SESSION_KEY_PREFIX}${sessionId}`;
    const ttlSeconds = Math.floor(DEFAULT_SESSION_TTL / 1000);
    const storedSession = await this.encryptSessionTokens(updatedSession);

    await this.redis.setex(key, ttlSeconds, JSON.stringify(storedSession));

    return updatedSession;
  }

  async getAllSessions(): Promise<Session[]> {
    const pattern = `${SESSION_KEY_PREFIX}*`;
    const sessions: Session[] = [];

    await scanKeys(this.redis, pattern, async (keys) => {
      for (const key of keys) {
        try {
          const data = await this.redis.get(key);
          if (data) {
            try {
              const storedSession = JSON.parse(data) as StoredSession;
              const session = await this.decryptSessionTokens(storedSession);
              sessions.push(session);
            } catch (parseError) {
              // Skip invalid sessions
            }
          }
        } catch (error) {
          // Skip errors
        }
      }
    });

    return sessions;
  }

  async getSessionCount(): Promise<number> {
    const pattern = `${SESSION_KEY_PREFIX}*`;
    let count = 0;

    await scanKeys(this.redis, pattern, async (keys) => {
      count += keys.length;
    });

    return count;
  }
}

export const sessionManager = new SessionManager();
