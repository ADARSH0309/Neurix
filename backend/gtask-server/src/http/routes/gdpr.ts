import { Response } from 'express';
import { sessionManager } from '../../session/index.js';
import type { AuthenticatedRequest } from '../auth/middleware.js';

/**
 * GDPR Compliance - Right to Erasure (Article 17)
 * Right to Portability (Article 20)
 *
 * GDPR Article 17: Right to Erasure
 * Users have the right to request deletion of their personal data.
 * Response time: Immediately (data deleted within seconds)
 *
 * GDPR Article 20: Right to Portability
 * Users have the right to receive their personal data in a structured,
 * commonly used, and machine-readable format (JSON).
 */

/**
 * Response type for Right to Erasure (DELETE /api/gdpr/user-data)
 */
interface GDPRErasureResponse {
  success: boolean;
  message: string;
  deletedAt: string;
  sessionsDeleted: number;
  tokensRevoked: number;
  gdprArticle: number;
}

/**
 * Session data for export (sanitized - no tokens)
 */
interface SanitizedSession {
  id: string;
  createdAt: number;
  expiresAt: number;
  lastAccessedAt: number;
  authenticated: boolean;
  oauthScopes?: string[];
}

/**
 * Response type for Right to Portability (GET /api/gdpr/user-data)
 */
interface GDPRDataExportResponse {
  userEmail: string;
  exportedAt: string;
  gdprArticle: number;
  activeSessions: number;
  totalSessions: number;
  sessions: SanitizedSession[];
}

/**
 * Revoke OAuth token with Google
 *
 * GDPR Article 17 compliance: When deleting user data, we must also
 * revoke their OAuth tokens to ensure complete data erasure.
 */
async function revokeGoogleOAuthToken(refreshToken: string): Promise<void> {
  try {
    const response = await fetch(
      `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (!response.ok) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Failed to revoke Google OAuth token',
        status: response.status,
        statusText: response.statusText,
      }));
    }
  } catch (error) {
    // Log error but continue with deletion
    // Deletion should not fail if revocation fails
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Error revoking Google OAuth token',
      error: error instanceof Error ? error.message : 'Unknown error',
    }));
  }
}

/**
 * DELETE /api/gdpr/user-data
 *
 * GDPR Article 17: Right to Erasure
 *
 * Deletes all user data from the system:
 * 1. Revokes OAuth tokens with Google
 * 2. Deletes all sessions from Redis
 * 3. Logs deletion event for audit purposes
 *
 * Rate Limited: 5 requests per 15 minutes (prevents abuse)
 * Authentication: Required (user must be authenticated via OAuth session)
 *
 * Returns: 200 OK with deletion confirmation
 * Error codes:
 * - 401: User not authenticated
 * - 500: Internal server error
 */
export async function handleDeleteUserData(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    // Get authenticated user's session
    const session = req.session;

    if (!session || !session.authenticated || !session.userEmail) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'You must be authenticated to delete your data',
      });
      return;
    }

    const userEmail = session.userEmail;

    // CRITICAL-006 Fix: Iterative deletion to prevent TOCTOU race condition
    // Keep deleting sessions until no more are found for this user
    // This prevents the race condition where new sessions are created
    // between the time-of-check (get sessions) and time-of-use (delete sessions)

    let totalSessionsDeleted = 0;
    let totalTokensRevoked = 0;
    let iterationCount = 0;
    const maxIterations = 10; // Prevent infinite loops

    while (iterationCount < maxIterations) {
      iterationCount++;

      // Get fresh list of sessions on each iteration
      const allSessions = await sessionManager.getAllSessions();
      const userSessions = allSessions.filter(s => s.userEmail === userEmail);

      // If no sessions found, we're done
      if (userSessions.length === 0) {
        break;
      }

      // Revoke OAuth tokens with Google for each session
      for (const userSession of userSessions) {
        if (userSession.tokens?.refresh_token) {
          await revokeGoogleOAuthToken(userSession.tokens.refresh_token);
          totalTokensRevoked++;
        }
      }

      // Delete all sessions from Redis
      for (const userSession of userSessions) {
        await sessionManager.deleteSession(userSession.id);
        totalSessionsDeleted++;
      }

      // Small delay to allow any in-flight session creations to complete
      // before checking again
      if (iterationCount < maxIterations) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const deletedAt = new Date().toISOString();

    // Log deletion event for GDPR audit trail
    console.log(JSON.stringify({
      timestamp: deletedAt,
      level: 'info',
      message: 'GDPR Right to Erasure executed',
      userEmail,
      sessionsDeleted: totalSessionsDeleted,
      tokensRevoked: totalTokensRevoked,
      iterations: iterationCount,
      gdprArticle: 17,
    }));

    // Return confirmation
    const response: GDPRErasureResponse = {
      success: true,
      message: 'All your data has been deleted',
      deletedAt,
      sessionsDeleted: totalSessionsDeleted,
      tokensRevoked: totalTokensRevoked,
      gdprArticle: 17,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'GDPR data deletion failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }));

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete user data. Please try again later.',
    });
  }
}

/**
 * GET /api/gdpr/user-data
 *
 * GDPR Article 20: Right to Portability
 *
 * Exports all user data in structured, machine-readable JSON format:
 * - Session metadata (created, expiry, last accessed times)
 * - OAuth scopes granted
 * - Session authentication status
 *
 * IMPORTANT: Encrypted OAuth tokens are NOT exported for security reasons.
 * GDPR requires portability of personal data, not security credentials.
 *
 * Rate Limited: 10 requests per hour (data export can be resource-intensive)
 * Authentication: Required (user must be authenticated via OAuth session)
 *
 * Returns: 200 OK with user data export in JSON format
 * Error codes:
 * - 401: User not authenticated
 * - 500: Internal server error
 */
export async function handleExportUserData(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    // Get authenticated user's session
    const session = req.session;

    if (!session || !session.authenticated || !session.userEmail) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'You must be authenticated to export your data',
      });
      return;
    }

    const userEmail = session.userEmail;

    // 1. Find all sessions for this user
    const allSessions = await sessionManager.getAllSessions();
    const userSessions = allSessions.filter(s => s.userEmail === userEmail);

    // 2. Sanitize sensitive data (remove encrypted tokens)
    // GDPR Article 20 requires portability of personal data, not security credentials
    const sanitizedSessions: SanitizedSession[] = userSessions.map(s => {
      const sanitized: SanitizedSession = {
        id: s.id,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        lastAccessedAt: s.lastAccessedAt,
        authenticated: s.authenticated,
      };

      // Include OAuth scopes if available (metadata about permissions granted)
      if (s.tokens?.scope) {
        sanitized.oauthScopes = s.tokens.scope.split(' ');
      }

      return sanitized;
    });

    const exportedAt = new Date().toISOString();

    // 3. Calculate active sessions (not expired)
    const now = Date.now();
    const activeSessions = sanitizedSessions.filter(s => s.expiresAt > now).length;

    // 4. Log export event for GDPR audit trail
    console.log(JSON.stringify({
      timestamp: exportedAt,
      level: 'info',
      message: 'GDPR Right to Portability executed',
      userEmail,
      sessionsExported: sanitizedSessions.length,
      gdprArticle: 20,
    }));

    // 5. Return data export
    const response: GDPRDataExportResponse = {
      userEmail,
      exportedAt,
      gdprArticle: 20,
      activeSessions,
      totalSessions: sanitizedSessions.length,
      sessions: sanitizedSessions,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'GDPR data export failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }));

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to export user data. Please try again later.',
    });
  }
}
