/**
 * Token Management Routes
 *
 * Provides HTTP endpoints for generating and managing bearer tokens.
 * Supports both legacy cookie-based auth and OAuth 2.1 authorization code exchange.
 *
 * Phase 5.1 - CRITICAL Security Item #1: Input Validation with Zod
 */

import { Request, Response } from 'express';
import { tokenManager } from '../auth/token-manager.js';
import { sessionManager } from '../../session/index.js';
import { authorizationCodeManager } from '../oauth/authorization-code-manager.js';
// Phase 5.1 - Week 2, Task 2.4: Prometheus Metrics (Issue #9)
import { token_generation_total } from '../metrics/prometheus.js';

const COOKIE_NAME = 'neurix_gforms_session';

/**
 * OAuth 2.1 Token Endpoint (RFC 6749)
 *
 * POST /api/generate-token
 *
 * Supports two flows:
 *
 * 1. OAuth 2.1 Authorization Code Exchange (for MCP Inspector):
 *    Body: { grant_type: "authorization_code", code: "...", redirect_uri: "...",
 *            code_verifier: "...", client_id: "..." }
 *    Returns: { access_token, token_type: "Bearer", expires_in }
 *
 * 2. Legacy Cookie-Based Token Generation:
 *    Requires: Session cookie
 *    Returns: { success: true, token, ... }
 */
export async function handleGenerateToken(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // Diagnostic logging to capture actual request format
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'debug',
      message: 'Token generation request received',
      body: req.body,
      contentType: req.headers['content-type'],
      hasBody: !!req.body,
      bodyKeys: req.body ? Object.keys(req.body) : [],
      grantType: req.body?.grant_type,
      hasCode: 'code' in (req.body || {}),
      hasRedirectUri: 'redirect_uri' in (req.body || {}),
      hasCodeVerifier: 'code_verifier' in (req.body || {}),
      hasClientId: 'client_id' in (req.body || {}),
    }));

    const grantType = req.body?.grant_type;

    // OAuth 2.1 Authorization Code Flow
    if (grantType === 'authorization_code') {
      await handleAuthorizationCodeExchange(req, res);
      return;
    }

    // Legacy Cookie-Based Flow
    await handleLegacyTokenGeneration(req, res);
  } catch (error) {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Token endpoint failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    );

    res.status(500).json({
      error: 'server_error',
      error_description: 'Internal server error',
    });
  }
}

/**
 * Handle OAuth 2.1 authorization code exchange
 *
 * Note: Validation performed directly here (not in middleware) because this endpoint
 * handles two request types, and middleware validation was stripping OAuth fields.
 */
async function handleAuthorizationCodeExchange(
  req: Request,
  res: Response
): Promise<void> {
  const { code, redirect_uri, code_verifier, client_id } = req.body;

  // Validate required OAuth 2.1 fields
  if (!code || !redirect_uri || !code_verifier || !client_id) {
    res.status(400).json({
      error: 'invalid_request',
      error_description: 'Missing required OAuth 2.1 parameters: code, redirect_uri, code_verifier, client_id',
    });
    return;
  }

  // Basic validation: ensure parameters are strings and within reasonable length
  if (
    typeof code !== 'string' || code.length > 512 ||
    typeof redirect_uri !== 'string' || redirect_uri.length > 2048 ||
    typeof code_verifier !== 'string' || code_verifier.length < 43 || code_verifier.length > 128 ||
    typeof client_id !== 'string' || client_id.length > 256
  ) {
    res.status(400).json({
      error: 'invalid_request',
      error_description: 'Invalid parameter format or length',
    });
    return;
  }

  // Validate and consume the authorization code
  const authzCode = await authorizationCodeManager.validateAndConsumeCode(
    code,
    client_id,
    redirect_uri,
    code_verifier
  );

  if (!authzCode) {
    // Phase 5.1 - Week 2, Task 2.4: Prometheus Metrics (Issue #9)
    token_generation_total.inc({ status: 'failure' });

    res.status(400).json({
      error: 'invalid_grant',
      error_description: 'Invalid or expired authorization code',
    });
    return;
  }

  // Create a new session with the Google tokens from the authorization code
  const session = await sessionManager.createSession({
    metadata: {
      userEmail: authzCode.user_email,
      clientId: authzCode.client_id,
      grantType: 'authorization_code',
    },
  });

  // Store Google tokens in the session
  await sessionManager.storeTokens(
    session.id,
    {
      access_token: authzCode.google_access_token,
      refresh_token: authzCode.google_refresh_token || '',
      scope: 'https://www.googleapis.com/auth/gmail.modify',
      token_type: 'Bearer',
      expiry_date: Date.now() + 3600 * 1000, // 1 hour
    },
    authzCode.user_email
  );

  // Generate bearer token for MCP requests
  const accessToken = await tokenManager.generateToken(session.id);
  const tokenData = await tokenManager.getTokenData(accessToken);

  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'OAuth authorization code exchanged for bearer token',
      clientId: authzCode.client_id,
      userEmail: authzCode.user_email,
      sessionId: session.id,
    })
  );

  // Phase 5.1 - Week 2, Task 2.4: Prometheus Metrics (Issue #9)
  token_generation_total.inc({ status: 'success' });

  // Return OAuth 2.1 token response
  res.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 86400, // 24 hours in seconds
    created_at: tokenData?.createdAt,
  });
}

/**
 * Handle legacy cookie-based token generation
 */
async function handleLegacyTokenGeneration(
  req: Request,
  res: Response
): Promise<void> {
  // Get session from cookie
  const sessionId = req.cookies[COOKIE_NAME];

  if (!sessionId) {
    // Phase 5.1 - Week 2, Task 2.4: Prometheus Metrics (Issue #9)
    token_generation_total.inc({ status: 'failure' });

    res.status(401).json({
      error: 'unauthorized',
      error_description: 'No session cookie found. Please authenticate at /auth/login',
    });
    return;
  }

  // Verify session exists and is authenticated
  const session = await sessionManager.getSession(sessionId);

  if (!session || !session.authenticated) {
    // Phase 5.1 - Week 2, Task 2.4: Prometheus Metrics (Issue #9)
    token_generation_total.inc({ status: 'failure' });

    res.status(401).json({
      error: 'unauthorized',
      error_description: 'Session not authenticated. Please complete OAuth flow at /auth/login',
    });
    return;
  }

  // Generate token
  const token = await tokenManager.generateToken(sessionId);
  const tokenData = await tokenManager.getTokenData(token);

  // Phase 5.1 - Week 2, Task 2.4: Prometheus Metrics (Issue #9)
  token_generation_total.inc({ status: 'success' });

  res.json({
    success: true,
    token,
    createdAt: tokenData?.createdAt,
    expiresAt: tokenData?.expiresAt,
    expiresIn: '24 hours',
    usage: {
      mcp_inspector: {
        url: process.env.PUBLIC_URL || 'https://gmail-mcp.daffyos.in',
        header: `Authorization: Bearer ${token}`,
      },
      curl_example: `curl -H "Authorization: Bearer ${token}" ${process.env.PUBLIC_URL || 'https://gmail-mcp.daffyos.in'}/`,
    },
  });
}

/**
 * Revoke a specific bearer token
 *
 * DELETE /api/token/:token
 *
 * Requires session cookie authentication.
 * Only allows revoking tokens associated with the current session.
 */
export async function handleRevokeToken(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const token = req.params.token as string;
    const sessionId = req.cookies[COOKIE_NAME];

    if (!sessionId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'No session cookie found',
      });
      return;
    }

    // Verify session exists
    const session = await sessionManager.getSession(sessionId);
    if (!session) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Session not found',
      });
      return;
    }

    // Verify token belongs to this session
    const tokenData = await tokenManager.getTokenData(token);
    if (!tokenData) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Token not found',
      });
      return;
    }

    if (tokenData.sessionId !== sessionId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Cannot revoke token from another session',
      });
      return;
    }

    // Revoke the token
    const success = await tokenManager.revokeToken(token);

    if (success) {
      res.json({
        success: true,
        message: 'Token revoked successfully',
      });
    } else {
      res.status(404).json({
        error: 'Not Found',
        message: 'Token not found or already revoked',
      });
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Token revocation failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    );

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to revoke token',
    });
  }
}

/**
 * List all tokens for the current session
 *
 * GET /api/tokens
 *
 * Requires session cookie authentication.
 * Returns list of tokens with metadata.
 */
export async function handleListTokens(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const sessionId = req.cookies[COOKIE_NAME];

    if (!sessionId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'No session cookie found',
      });
      return;
    }

    // Verify session exists
    const session = await sessionManager.getSession(sessionId);
    if (!session) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Session not found',
      });
      return;
    }

    // Get all tokens for this session
    const tokens = await tokenManager.listTokensForSession(sessionId);

    res.json({
      success: true,
      count: tokens.length,
      tokens: tokens.map((t) => ({
        token: t.token,
        createdAt: t.createdAt,
        expiresAt: t.expiresAt,
        // Don't include full token in list for security
        tokenPreview: t.token.substring(0, 8) + '...',
      })),
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Token listing failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    );

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to list tokens',
    });
  }
}

/**
 * Revoke all tokens for the current session
 *
 * DELETE /api/tokens
 *
 * Requires session cookie authentication.
 */
export async function handleRevokeAllTokens(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const sessionId = req.cookies[COOKIE_NAME];

    if (!sessionId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'No session cookie found',
      });
      return;
    }

    // Verify session exists
    const session = await sessionManager.getSession(sessionId);
    if (!session) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Session not found',
      });
      return;
    }

    // Revoke all tokens for this session
    const count = await tokenManager.revokeTokensForSession(sessionId);

    res.json({
      success: true,
      message: `${count} token(s) revoked`,
      count,
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Bulk token revocation failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    );

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to revoke tokens',
    });
  }
}

/**
 * Get token information (for debugging/display)
 *
 * GET /api/token/:token
 *
 * Requires session cookie authentication.
 * Only allows accessing tokens associated with the current session.
 */
export async function handleGetTokenInfo(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const token = req.params.token as string;
    const sessionId = req.cookies[COOKIE_NAME];

    if (!sessionId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'No session cookie found',
      });
      return;
    }

    // Verify session exists
    const session = await sessionManager.getSession(sessionId);
    if (!session) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Session not found',
      });
      return;
    }

    // Get token data
    const tokenData = await tokenManager.getTokenData(token);

    if (!tokenData) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Token not found',
      });
      return;
    }

    // Verify token belongs to this session
    if (tokenData.sessionId !== sessionId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Cannot access token from another session',
      });
      return;
    }

    // Calculate remaining time
    const now = new Date();
    const expiresAt = new Date(tokenData.expiresAt);
    const remainingMs = expiresAt.getTime() - now.getTime();
    const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
    const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

    res.json({
      success: true,
      token: tokenData.token,
      createdAt: tokenData.createdAt,
      expiresAt: tokenData.expiresAt,
      remaining: {
        hours: remainingHours,
        minutes: remainingMinutes,
        total: `${remainingHours}h ${remainingMinutes}m`,
      },
      valid: remainingMs > 0,
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Token info retrieval failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    );

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve token info',
    });
  }
}
