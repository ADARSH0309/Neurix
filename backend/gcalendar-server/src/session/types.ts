/**
 * Session Management Types
 */

export interface OAuthTokens {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

export interface Session {
  /** Unique session ID (UUID v4) */
  id: string;

  /** When the session was created (Unix timestamp in ms) */
  createdAt: number;

  /** When the session expires (Unix timestamp in ms) */
  expiresAt: number;

  /** When the session was last accessed (Unix timestamp in ms) */
  lastAccessedAt: number;

  /** Whether the user has completed OAuth authentication */
  authenticated: boolean;

  /** Google Calendar OAuth tokens (populated after OAuth flow) */
  tokens?: OAuthTokens;

  /** User's Google email address (fetched after authentication) */
  userEmail?: string;

  /** Additional metadata */
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    [key: string]: any;
  };
}

export interface SessionCreateOptions {
  /** Session duration in milliseconds (default: 24 hours) */
  ttl?: number;

  /** Initial metadata to attach to the session */
  metadata?: Session['metadata'];
}

export interface SessionManager {
  /** Create a new session */
  createSession(options?: SessionCreateOptions): Promise<Session>;

  /** Get a session by ID */
  getSession(sessionId: string): Promise<Session | null>;

  /** Update a session */
  updateSession(sessionId: string, updates: Partial<Session>): Promise<Session | null>;

  /** Store OAuth tokens in a session */
  storeTokens(sessionId: string, tokens: OAuthTokens, userEmail?: string): Promise<Session | null>;

  /** Delete a session */
  deleteSession(sessionId: string): Promise<boolean>;

  /** Cleanup expired sessions */
  cleanupExpiredSessions(): Promise<number>;

  /** Refresh session expiry (extend TTL) */
  refreshSession(sessionId: string): Promise<Session | null>;
}
