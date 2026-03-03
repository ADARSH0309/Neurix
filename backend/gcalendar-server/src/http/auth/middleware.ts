/**
 * Dual Authentication Middleware (Bearer Token + Session Cookie[small peice of data, server sned to the browser, and the browser stores it and sends it back with every
   subsequent request to that server])
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
  success: boolean;               // Did authentication work?
  session?: Session;              // If authenticated, the session data
  sessionId?: string;             // If authenticated, the session ID
  method?: 'bearer' | 'cookie';   // If yes, which method worked?
  error?: string;                 // If no, what went wrong?
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

async function authenticateWithBearerToken(req: Request): Promise<AuthResult> {

  // Step 1: Extract the token from the request header
  const token = extractBearerToken(req);
  if (!token) return { success: false, error: 'No bearer token found' };

  // Step 2: Check if this token is valid (look it up in Redis)
  const validation = await tokenManager.validateToken(token);
  if (!validation.valid) {

    // LOG a security event — someone tried an invalid token!
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

  // Step 3: Token is valid, but does the SESSION still exist?
  const session = await sessionManager.getSession(validation.sessionId!);
  if (!session || !session.authenticated) {
    return { success: false, error: 'Session not found or not authenticated' };
  }

  // Step 4: Everything checks out!
  return { success: true, session, sessionId: session.id, method: 'bearer' };
}

async function authenticateWithCookie(req: Request): Promise<AuthResult> {
  
  // Step 1: Look for the session cookie
  const sessionId = req.cookies[COOKIE_NAME];
  if (!sessionId) return { success: false, error: 'No session cookie found' };

  // Step 2: Look up the session in the session manager
  const session = await sessionManager.getSession(sessionId);
  if (!session || !session.authenticated) {
    return { success: false, error: 'Session not found or not authenticated' };
  }

  // Step 3: Cookie is valid and session exists!
  return { success: true, session, sessionId: session.id, method: 'cookie' };
}

export function requireAuth() {       //strict gaurd
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {

      // STEP 1: Try bearer token first
      let authResult = await authenticateWithBearerToken(req);

      // STEP 2: if brearer failed, try cookie
      if (!authResult.success) {
        authResult = await authenticateWithCookie(req);
      }
      
      // STEP 3: if both failed, reject the request
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

      // STEP 4: Auth succeeded! Attach user info to the request
      req.session = authResult.session;
      req.sessionId = authResult.sessionId;
      req.authMethod = authResult.method;
      next();               // Let them through to the next middleware/route
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

export function optionalAuth() {            // lenient gaurd
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {

      // Try bearer token first, then cookie, but don't fail if both are missing/invalid
      let authResult = await authenticateWithBearerToken(req);
      if (!authResult.success) {
        authResult = await authenticateWithCookie(req);
      }

      // if it worked, attached session info
      if (authResult.success) {
        req.session = authResult.session;
        req.sessionId = authResult.sessionId;
        req.authMethod = authResult.method;
      }

      // ALWAYS call next(), even if auth failed
      next();
    } catch (error) {
      next();           // Even if an error happens, let the request through
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
    authenticated: !!req.session?.authenticated,      // true or false
    method: req.authMethod,                           // bearer or cookie
    sessionId: req.sessionId,                         // which session (if authenticated)
    userEmail: req.session?.userEmail,                // who is it (if authenticated)
  };
}
