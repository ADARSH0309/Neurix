/**
 * Dual Authentication Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { tokenManager } from './token-manager.js';
import { sessionManager } from '../../session/index.js';
import type { Session } from '../../session/types.js';

const COOKIE_NAME = 'neurix_gcalendar_session';

export interface AuthenticatedRequest extends Request {
  session?: Session;
  sessionId?: string;
  authMethod?: 'bearer' | 'cookie';
}

interface AuthResult {
  success: boolean;
  session?: Session;
  sessionId?: string;
  method?: 'bearer' | 'cookie';
  error?: string;
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

async function authenticateWithBearerToken(req: Request): Promise<AuthResult> {
  const token = extractBearerToken(req);
  if (!token) return { success: false, error: 'No bearer token found' };

  const validation = await tokenManager.validateToken(token);
  if (!validation.valid) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'security',
      event: 'authentication_failed',
      method: 'bearer_token',
      reason: validation.error || 'Invalid token',
      token_preview: token.substring(0, 8) + '...',
    }));
    return { success: false, error: validation.error || 'Invalid token' };
  }

  const session = await sessionManager.getSession(validation.sessionId!);
  if (!session || !session.authenticated) {
    return { success: false, error: 'Session not found or not authenticated' };
  }

  return { success: true, session, sessionId: session.id, method: 'bearer' };
}

async function authenticateWithCookie(req: Request): Promise<AuthResult> {
  const sessionId = req.cookies[COOKIE_NAME];
  if (!sessionId) return { success: false, error: 'No session cookie found' };

  const session = await sessionManager.getSession(sessionId);
  if (!session || !session.authenticated) {
    return { success: false, error: 'Session not found or not authenticated' };
  }

  return { success: true, session, sessionId: session.id, method: 'cookie' };
}

export function requireAuth() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      let authResult = await authenticateWithBearerToken(req);
      if (!authResult.success) {
        authResult = await authenticateWithCookie(req);
      }

      if (!authResult.success) {
        res.status(401).json({
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32000,
            message: 'Authentication required. Please authenticate with bearer token or session cookie.',
            details: authResult.error,
          },
        });
        return;
      }

      req.session = authResult.session;
      req.sessionId = authResult.sessionId;
      req.authMethod = authResult.method;
      next();
    } catch (error) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Authentication middleware error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
      res.status(500).json({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32603, message: 'Internal authentication error' },
      });
    }
  };
}

export function optionalAuth() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      let authResult = await authenticateWithBearerToken(req);
      if (!authResult.success) {
        authResult = await authenticateWithCookie(req);
      }
      if (authResult.success) {
        req.session = authResult.session;
        req.sessionId = authResult.sessionId;
        req.authMethod = authResult.method;
      }
      next();
    } catch (error) {
      next();
    }
  };
}

export function getAuthInfo(req: AuthenticatedRequest): {
  authenticated: boolean;
  method?: string;
  sessionId?: string;
  userEmail?: string;
} {
  return {
    authenticated: !!req.session?.authenticated,
    method: req.authMethod,
    sessionId: req.sessionId,
    userEmail: req.session?.userEmail,
  };
}
