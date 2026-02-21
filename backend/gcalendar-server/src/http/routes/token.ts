/**
 * Token Management Routes
 */

import type { Request, Response } from 'express';
import { tokenManager } from '../auth/token-manager.js';
import { sessionManager } from '../../session/index.js';
import { authorizationCodeManager } from '../oauth/authorization-code-manager.js';
import { token_generation_total } from '../metrics/prometheus.js';

const COOKIE_NAME = 'neurix_gcalendar_session';

/**
 * POST /api/generate-token
 * Generates a bearer token for MCP Inspector
 */
export async function handleGenerateToken(req: Request, res: Response): Promise<void> {
  try {
    // Check for OAuth 2.1 Authorization Code flow
    const grantType = req.body.grant_type;

    if (grantType === 'authorization_code') {
      // OAuth 2.1 + PKCE flow (for MCP Inspector)
      const code = req.body.code;
      const redirectUri = req.body.redirect_uri;
      const codeVerifier = req.body.code_verifier;
      const clientId = req.body.client_id;

      if (!code || !redirectUri || !codeVerifier || !clientId) {
        token_generation_total.inc({ status: 'failure' });

        res.status(400).json({
          error: 'invalid_request',
          error_description: 'Missing required parameters: code, redirect_uri, code_verifier, client_id',
        });
        return;
      }

      // Validate and consume the authorization code
      const authzCode = await authorizationCodeManager.validateAndConsumeCode(
        code,
        clientId,
        redirectUri,
        codeVerifier
      );

      if (!authzCode) {
        token_generation_total.inc({ status: 'failure' });

        res.status(400).json({
          error: 'invalid_grant',
          error_description: 'Authorization code invalid, expired, or already used',
        });
        return;
      }

      // Create a new session for this token
      const session = await sessionManager.createSession({
        metadata: {
          client_id: clientId,
          grant_type: 'authorization_code',
        },
      });

      // Store the Google tokens in the session
      await sessionManager.storeTokens(
        session.id,
        {
          access_token: authzCode.google_access_token,
          refresh_token: authzCode.google_refresh_token || '',
          scope: 'https://www.googleapis.com/auth/calendar',
          token_type: 'Bearer',
          expiry_date: Date.now() + 3600 * 1000,
        },
        authzCode.user_email
      );

      // Generate bearer token
      const bearerToken = await tokenManager.generateToken(session.id);

      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Bearer token generated via OAuth 2.1 authorization code flow',
        sessionId: session.id,
        clientId,
        userEmail: authzCode.user_email,
      }));

      token_generation_total.inc({ status: 'success' });

      // RFC 6749 Section 5.1 token response format
      res.json({
        access_token: bearerToken,
        token_type: 'Bearer',
        expires_in: 24 * 60 * 60, // 24 hours
      });
      return;
    }

    // Legacy cookie-based flow
    const sessionId = req.cookies[COOKIE_NAME];

    if (!sessionId) {
      token_generation_total.inc({ status: 'failure' });

      res.status(401).json({
        error: 'unauthorized',
        error_description: 'No session cookie found. Please authenticate first.',
      });
      return;
    }

    const session = await sessionManager.getSession(sessionId);

    if (!session || !session.authenticated) {
      token_generation_total.inc({ status: 'failure' });

      res.status(401).json({
        error: 'unauthorized',
        error_description: 'Session not found or not authenticated',
      });
      return;
    }

    const bearerToken = await tokenManager.generateToken(sessionId);

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Bearer token generated (legacy cookie flow)',
      sessionId,
      userEmail: session.userEmail,
    }));

    token_generation_total.inc({ status: 'success' });

    res.json({
      access_token: bearerToken,
      token_type: 'Bearer',
      expires_in: 24 * 60 * 60,
    });
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Token generation failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }));

    token_generation_total.inc({ status: 'failure' });

    res.status(500).json({
      error: 'server_error',
      error_description: 'Failed to generate token',
    });
  }
}

/**
 * DELETE /api/token/:token
 */
export async function handleRevokeToken(req: Request, res: Response): Promise<void> {
  try {
    const token = req.params.token as string;

    const result = await tokenManager.revokeToken(token);

    if (result) {
      res.json({
        success: true,
        message: 'Token revoked successfully',
      });
    } else {
      res.status(404).json({
        error: 'Token not found',
      });
    }
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Token revocation failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }));

    res.status(500).json({
      error: 'Failed to revoke token',
    });
  }
}

/**
 * GET /api/tokens
 */
export async function handleListTokens(req: Request, res: Response): Promise<void> {
  try {
    const sessionId = req.cookies[COOKIE_NAME];

    if (!sessionId) {
      res.status(401).json({
        error: 'No session cookie found',
      });
      return;
    }

    const tokens = await tokenManager.listTokensForSession(sessionId);

    res.json({
      success: true,
      tokens: tokens.map(t => ({
        token: t.token.substring(0, 8) + '...',
        createdAt: t.createdAt,
        expiresAt: t.expiresAt,
      })),
    });
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Failed to list tokens',
      error: error instanceof Error ? error.message : 'Unknown error',
    }));

    res.status(500).json({
      error: 'Failed to list tokens',
    });
  }
}

/**
 * DELETE /api/tokens
 */
export async function handleRevokeAllTokens(req: Request, res: Response): Promise<void> {
  try {
    const sessionId = req.cookies[COOKIE_NAME];

    if (!sessionId) {
      res.status(401).json({
        error: 'No session cookie found',
      });
      return;
    }

    const count = await tokenManager.revokeTokensForSession(sessionId);

    res.json({
      success: true,
      message: `${count} tokens revoked`,
      revokedCount: count,
    });
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Failed to revoke all tokens',
      error: error instanceof Error ? error.message : 'Unknown error',
    }));

    res.status(500).json({
      error: 'Failed to revoke tokens',
    });
  }
}

/**
 * GET /api/token/:token
 */
export async function handleGetTokenInfo(req: Request, res: Response): Promise<void> {
  try {
    const token = req.params.token as string;

    const tokenData = await tokenManager.getTokenData(token);

    if (!tokenData) {
      res.status(404).json({
        error: 'Token not found',
      });
      return;
    }

    res.json({
      success: true,
      token: {
        token: tokenData.token.substring(0, 8) + '...',
        createdAt: tokenData.createdAt,
        expiresAt: tokenData.expiresAt,
      },
    });
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Failed to get token info',
      error: error instanceof Error ? error.message : 'Unknown error',
    }));

    res.status(500).json({
      error: 'Failed to get token info',
    });
  }
}
