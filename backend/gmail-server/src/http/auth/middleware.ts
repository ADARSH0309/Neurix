/**
 * Dual Authentication Middleware
 *
 * Supports two authentication methods:
 * 1. Bearer Token (for MCP Inspector)
 * 2. Session Cookie (for web UI)
 */

import { Request, Response, NextFunction } from 'express';
import { tokenManager } from './token-manager.js';
import { sessionManager } from '../../session/index.js';
import type { Session } from '../../session/types.js';

const COOKIE_NAME = 'neurix_gmail_session';

/**
 * Extended Request interface with authentication data
 */
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

  if (!authHeader) {
    return null;
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

async function authenticateWithBearerToken(req: Request): Promise<AuthResult> {
  const token = extractBearerToken(req);

  if (!token) {
    return { success: false, error: 'No bearer token found' };
  }

  const validation = await tokenManager.validateToken(token);

  if (!validation.valid) {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: 'Bearer token validation failed',
        error: validation.error,
        tokenPreview: token.substring(0, 8) + '...',
      })
    );

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
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: 'Bearer token valid but session not found or not authenticated',
        sessionId: validation.sessionId,
      })
    );

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'security',
      event: 'authentication_failed',
      method: 'bearer_token',
      reason: 'Session not found or not authenticated',
      sessionId: validation.sessionId,
    }));

    return { success: false, error: 'Session not found or not authenticated' };
  }

  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Bearer token authentication successful',
      sessionId: session.id,
      userEmail: session.userEmail,
    })
  );

  return {
    success: true,
    session,
    sessionId: session.id,
    method: 'bearer',
  };
}

async function authenticateWithCookie(req: Request): Promise<AuthResult> {
  const sessionId = req.cookies[COOKIE_NAME];

  if (!sessionId) {
    return { success: false, error: 'No session cookie found' };
  }

  const session = await sessionManager.getSession(sessionId);

  if (!session || !session.authenticated) {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: 'Cookie authentication failed - session not found or not authenticated',
        sessionId,
      })
    );

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'security',
      event: 'authentication_failed',
      method: 'session_cookie',
      reason: 'Session not found or not authenticated',
      sessionId,
    }));

    return { success: false, error: 'Session not found or not authenticated' };
  }

  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'debug',
      message: 'Cookie authentication successful',
      sessionId: session.id,
      userEmail: session.userEmail,
    })
  );

  return {
    success: true,
    session,
    sessionId: session.id,
    method: 'cookie',
  };
}

/**
 * Dual authentication middleware
 */
export function requireAuth() {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      let authResult = await authenticateWithBearerToken(req);

      if (!authResult.success) {
        authResult = await authenticateWithCookie(req);
      }

      if (!authResult.success) {
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'security',
          event: 'authentication_failed',
          method: 'both_bearer_and_cookie',
          reason: authResult.error || 'No valid credentials',
          ip: req.ip,
          endpoint: req.path,
          userAgent: req.get('user-agent'),
        }));

        res.status(401).json({
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32000,
            message:
              'Authentication required. Please authenticate with bearer token or session cookie.',
            details: authResult.error,
          },
        });
        return;
      }

      req.session = authResult.session;
      req.sessionId = authResult.sessionId;
      req.authMethod = authResult.method;

      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Request authenticated',
          method: authResult.method,
          sessionId: authResult.sessionId,
          userEmail: authResult.session?.userEmail,
          path: req.path,
        })
      );

      next();
    } catch (error) {
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: 'Authentication middleware error',
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        })
      );

      res.status(500).json({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: 'Internal authentication error',
        },
      });
    }
  };
}

/**
 * Optional authentication middleware
 */
export function optionalAuth() {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
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
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: 'Optional authentication middleware error',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      );

      next();
    }
  };
}

/**
 * Get authentication info from request
 */
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
