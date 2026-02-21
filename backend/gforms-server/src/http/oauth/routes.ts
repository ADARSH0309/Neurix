/**
 * OAuth Routes
 *
 * Handles OAuth 2.1 flow for Gmail authentication with MCP Inspector support:
 * - GET /auth/login: Initiates OAuth flow (supports PKCE for MCP Inspector)
 * - GET /oauth2callback: Handles OAuth callback and token exchange
 *
 * Flow for MCP Inspector (OAuth Authorization Code flow):
 * 1. Inspector calls /auth/login?client_id=...&redirect_uri=...&code_challenge=...&state=...
 * 2. Server stores PKCE request in session
 * 3. User completes Google OAuth
 * 4. Server exchanges Google code for tokens
 * 5. Server generates its own authorization code
 * 6. Server redirects to Inspector with code and state
 * 7. Inspector exchanges code at /api/generate-token for bearer token
 */

import type { Request, Response } from 'express';
import { OAuthClientManager } from './client.js';
import { sessionManager } from '../../session/index.js';
import { authorizationCodeManager } from './authorization-code-manager.js';
import type { OAuthConfig } from './types.js';
import { renderSafeErrorPage, renderSafeSuccessPage } from '../../utils/html-sanitizer.js';
import { isRedirectUriAllowed, logRedirectUriWhitelist } from './redirect-validator.js';
// Phase 5.1 - Week 2, Task 2.4: Prometheus Metrics (Issue #9)
import { oauth_requests_total } from '../metrics/prometheus.js';

const COOKIE_NAME = 'neurix_gforms_session';
// Phase 4.5: Enhanced Cookie Security
const COOKIE_OPTIONS = {
  httpOnly: true, // Prevent JavaScript access
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'none' as const, // Allow cross-origin requests (required for MCP Inspector)
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  domain: process.env.COOKIE_DOMAIN, // Optional: set domain for production
  path: '/', // Cookie available on all paths
};

let oauthClient: OAuthClientManager;

/**
 * Initialize OAuth client
 */
export function initializeOAuthClient(config: OAuthConfig): void {
  oauthClient = new OAuthClientManager(config);

  // Phase 5.1 - Week 1, Task 1.4: Log redirect URI whitelist on startup
  logRedirectUriWhitelist();
}

/**
 * GET /auth/login
 *
 * Initiates OAuth flow with support for MCP Inspector OAuth 2.1 + PKCE:
 * 1. Accepts optional PKCE parameters (client_id, redirect_uri, code_challenge, state)
 * 2. Creates a new session
 * 3. Stores PKCE request in session metadata (if provided)
 * 4. Uses session ID as OAuth state (CSRF protection)
 * 5. Redirects user to Google OAuth consent screen
 *
 * Query parameters:
 * - redirect_uri: Where to redirect after OAuth (optional, for MCP Inspector)
 * - client_id: OAuth client ID (optional, for PKCE flow)
 * - code_challenge: PKCE code challenge (optional)
 * - code_challenge_method: Should be 'S256' (optional)
 * - state: CSRF state parameter (optional)
 * - response_type: Should be 'code' (optional)
 */
export async function handleLogin(req: Request, res: Response): Promise<void> {
  try {
    // Extract OAuth 2.1 + PKCE parameters
    const redirectUri = typeof req.query.redirect_uri === 'string' ? req.query.redirect_uri : undefined;
    const clientId = typeof req.query.client_id === 'string' ? req.query.client_id : undefined;
    const codeChallenge = typeof req.query.code_challenge === 'string' ? req.query.code_challenge : undefined;
    const codeChallengeMethod = typeof req.query.code_challenge_method === 'string' ? req.query.code_challenge_method : undefined;
    const state = typeof req.query.state === 'string' ? req.query.state : undefined;
    const responseType = typeof req.query.response_type === 'string' ? req.query.response_type : undefined;

    // Phase 5.1 - Week 1, Task 1.4: Validate redirect URI against whitelist
    // Phase 5.1 - Week 2, Task 2.4: DCR Integration - check both static whitelist AND dynamically registered clients
    if (redirectUri && !(await isRedirectUriAllowed(redirectUri, clientId))) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'OAuth login rejected: redirect_uri not in whitelist',
        redirectUri,
        clientId,
        ip: req.ip,
      }));

      // Phase 5.1 - Week 2, Task 2.2: Security Audit Logging (Issue #7)
      // Security audit log for failed OAuth attempt (invalid redirect_uri)
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'security',
        event: 'authentication_failed',
        method: 'oauth',
        reason: 'redirect_uri_not_whitelisted',
        redirectUri,
        clientId,
        ip: req.ip,
      }));

      res.status(400).json({
        error: 'invalid_request',
        error_description: 'redirect_uri is not whitelisted',
      });
      return;
    }

    // Determine if this is a PKCE flow (MCP Inspector)
    const isPKCEFlow = Boolean(clientId && redirectUri && codeChallenge);

    // Create new session
    const session = await sessionManager.createSession({
      metadata: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        redirectUri, // Store redirect URI in session metadata
        isPKCEFlow,
      },
    });

    // Store PKCE authorization request if this is a PKCE flow
    if (isPKCEFlow && codeChallenge && clientId && redirectUri) {
      await authorizationCodeManager.storeAuthorizationRequest(session.id, {
        client_id: clientId,
        redirect_uri: redirectUri,
        state,
        code_challenge: codeChallenge,
        code_challenge_method: codeChallengeMethod || 'S256',
        response_type: responseType || 'code',
      });

      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'OAuth login initiated with PKCE',
        sessionId: session.id,
        clientId,
        redirectUri,
        hasPKCE: true,
      }));
    } else {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'OAuth login initiated (legacy flow)',
        sessionId: session.id,
        ip: req.ip,
        redirectUri,
        hasPKCE: false,
      }));
    }

    // Set session cookie
    res.cookie(COOKIE_NAME, session.id, COOKIE_OPTIONS);

    // Generate OAuth URL with session ID as state
    const authUrl = oauthClient.generateAuthUrl(session.id);

    // Redirect to Google OAuth
    res.redirect(authUrl);
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'OAuth login failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }));

    res.status(500).json({
      error: 'Failed to initiate OAuth flow',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * GET /oauth2callback
 *
 * Handles OAuth callback from Google:
 * 1. Validates state parameter (CSRF check)
 * 2. Exchanges authorization code for tokens
 * 3. Fetches user info
 * 4. Stores tokens in Redis session
 * 5. Redirects to success page
 *
 * Phase 5.1 - CRITICAL Security: Input validation performed by Zod middleware (oauthCallbackSchema)
 * before this function is called. req.query is guaranteed to be valid.
 */
export async function handleOAuthCallback(req: Request, res: Response): Promise<void> {
  try {
    // Zod middleware guarantees these are valid strings
    const { code, state, error: oauthError } = req.query;

    // Check for OAuth errors
    if (oauthError) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'OAuth error from Google',
        error: oauthError,
      }));

      // Phase 5.1 - Week 2, Task 2.2: Security Audit Logging (Issue #7)
      // Security audit log for failed OAuth callback (error from Google)
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'security',
        event: 'authentication_failed',
        method: 'oauth_callback',
        reason: 'oauth_error_from_google',
        error: oauthError,
        ip: req.ip,
      }));

      // Phase 5.1 - Week 2, Task 2.4: Prometheus Metrics (Issue #9)
      // Track OAuth failure metric (flow type determined later)
      oauth_requests_total.inc({ status: 'failure', flow_type: 'pkce' });

      // Phase 5.2 - XSS Protection: Use safe HTML rendering
      res.status(400).send(
        renderSafeErrorPage(
          'Authentication Failed',
          'Authentication Failed',
          `An error occurred during authentication: ${oauthError}`
        )
      );
      return;
    }

    // Verify state matches session ID (CSRF protection)
    // Type assertion: Zod validation guarantees this is a string
    const sessionId = state as string;
    const session = await sessionManager.getSession(sessionId);

    if (!session) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Invalid or expired session in OAuth callback',
        sessionId,
      }));

      // Phase 5.1 - Week 2, Task 2.2: Security Audit Logging (Issue #7)
      // Security audit log for failed OAuth callback (invalid session)
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'security',
        event: 'authentication_failed',
        method: 'oauth_callback',
        reason: 'invalid_or_expired_session',
        sessionId,
        ip: req.ip,
      }));

      // Phase 5.1 - Week 2, Task 2.4: Prometheus Metrics (Issue #9)
      oauth_requests_total.inc({ status: 'failure', flow_type: 'pkce' });

      // Phase 5.2 - XSS Protection: Use safe HTML rendering
      res.status(400).send(
        renderSafeErrorPage(
          'Session Expired',
          'Authentication Failed',
          'Session expired or invalid. Please try again.'
        )
      );
      return;
    }

    // Exchange code for tokens
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Exchanging OAuth code for tokens',
      sessionId,
    }));

    // Type assertion: Zod validation guarantees this is a string
    const tokens = await oauthClient.exchangeCodeForTokens(code as string);

    // Get user info
    const userInfo = await oauthClient.getUserInfo(tokens.access_token);

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'OAuth tokens received',
      sessionId,
      userEmail: userInfo.email,
    }));

    // Store tokens in session
    await sessionManager.storeTokens(sessionId, tokens, userInfo.email);

    // Set session cookie (refresh it)
    res.cookie(COOKIE_NAME, sessionId, COOKIE_OPTIONS);

    // Check if this was a PKCE flow (MCP Inspector)
    const isPKCEFlow = session.metadata?.isPKCEFlow;

    if (isPKCEFlow) {
      // OAuth 2.1 Authorization Code flow with PKCE (for MCP Inspector)
      // Retrieve the stored authorization request
      const authzRequest = await authorizationCodeManager.getAuthorizationRequest(sessionId);

      if (!authzRequest) {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: 'Authorization request not found for PKCE flow',
          sessionId,
        }));

        // Phase 5.1 - Week 2, Task 2.2: Security Audit Logging (Issue #7)
        // Security audit log for failed OAuth callback (PKCE request not found)
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'security',
          event: 'authentication_failed',
          method: 'oauth_callback_pkce',
          reason: 'authorization_request_not_found',
          sessionId,
          ip: req.ip,
        }));

        // Phase 5.1 - Week 2, Task 2.4: Prometheus Metrics (Issue #9)
        oauth_requests_total.inc({ status: 'failure', flow_type: 'pkce' });

        // Phase 5.2 - XSS Protection: Use safe HTML rendering
        res.status(400).send(
          renderSafeErrorPage(
            'Authorization Failed',
            'Authorization Failed',
            'Session expired or invalid. Please try again.'
          )
        );
        return;
      }

      // Phase 5.1 - Week 1, Task 1.4: Validate redirect URI before redirecting
      if (!isRedirectUriAllowed(authzRequest.redirect_uri)) {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: 'OAuth callback rejected: redirect_uri not in whitelist',
          redirectUri: authzRequest.redirect_uri,
          sessionId,
        }));

        // Phase 5.1 - Week 2, Task 2.2: Security Audit Logging (Issue #7)
        // Security audit log for failed OAuth callback (invalid redirect_uri in PKCE flow)
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'security',
          event: 'authentication_failed',
          method: 'oauth_callback_pkce',
          reason: 'redirect_uri_not_whitelisted',
          redirectUri: authzRequest.redirect_uri,
          sessionId,
          ip: req.ip,
        }));

        // Phase 5.1 - Week 2, Task 2.4: Prometheus Metrics (Issue #9)
        oauth_requests_total.inc({ status: 'failure', flow_type: 'pkce' });

        // Phase 5.2 - XSS Protection: Use safe HTML rendering
        res.status(400).send(
          renderSafeErrorPage(
            'Invalid Redirect',
            'Authorization Failed',
            'Redirect URI is not whitelisted for security reasons.'
          )
        );
        return;
      }

      // Generate our own authorization code
      const authorizationCode = await authorizationCodeManager.generateAuthorizationCode(
        authzRequest.client_id,
        authzRequest.redirect_uri,
        authzRequest.code_challenge,
        'S256',
        userInfo.email,
        tokens.access_token,
        tokens.refresh_token,
        authzRequest.state
      );

      // Clean up the authorization request (no longer needed)
      await authorizationCodeManager.deleteAuthorizationRequest(sessionId);

      // Redirect to Inspector with our authorization code and state
      const redirectUrl = new URL(authzRequest.redirect_uri);
      redirectUrl.searchParams.set('code', authorizationCode);
      if (authzRequest.state) {
        redirectUrl.searchParams.set('state', authzRequest.state);
      }

      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Redirecting to MCP Inspector with authorization code',
        sessionId,
        redirectUri: authzRequest.redirect_uri,
        clientId: authzRequest.client_id,
        userEmail: userInfo.email,
      }));

      // Phase 5.1 - Week 2, Task 2.4: Prometheus Metrics (Issue #9)
      oauth_requests_total.inc({ status: 'success', flow_type: 'pkce' });

      res.redirect(redirectUrl.toString());
      return;
    }

    // Legacy flow: check if there's a redirect_uri in session metadata
    const redirectUri = session.metadata?.redirectUri;

    if (redirectUri && typeof redirectUri === 'string') {
      // Phase 5.1 - Week 1, Task 1.4: Validate redirect URI before redirecting
      if (!isRedirectUriAllowed(redirectUri)) {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: 'OAuth callback rejected: redirect_uri not in whitelist (legacy flow)',
          redirectUri,
          sessionId,
        }));

        // Phase 5.1 - Week 2, Task 2.2: Security Audit Logging (Issue #7)
        // Security audit log for failed OAuth callback (invalid redirect_uri in legacy flow)
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'security',
          event: 'authentication_failed',
          method: 'oauth_callback_legacy',
          reason: 'redirect_uri_not_whitelisted',
          redirectUri,
          sessionId,
          ip: req.ip,
        }));

        // Phase 5.1 - Week 2, Task 2.4: Prometheus Metrics (Issue #9)
        oauth_requests_total.inc({ status: 'failure', flow_type: 'legacy' });

        // Phase 5.2 - XSS Protection: Use safe HTML rendering
        res.status(400).send(
          renderSafeErrorPage(
            'Invalid Redirect',
            'Authorization Failed',
            'Redirect URI is not whitelisted for security reasons.'
          )
        );
        return;
      }

      // Legacy flow: Generate bearer token for backward compatibility
      const { tokenManager } = await import('../auth/token-manager.js');
      const bearerToken = await tokenManager.generateToken(sessionId);

      // Redirect back to the original source with bearer token
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Redirecting to original source after OAuth success (legacy flow)',
        sessionId,
        redirectUri,
        bearerTokenGenerated: true,
      }));

      // Phase 5.1 - Week 2, Task 2.4: Prometheus Metrics (Issue #9)
      oauth_requests_total.inc({ status: 'success', flow_type: 'legacy' });

      // Append token to redirect URI (either as query param or hash fragment)
      const redirectUrl = new URL(redirectUri);
      redirectUrl.searchParams.set('access_token', bearerToken);
      redirectUrl.searchParams.set('token_type', 'Bearer');

      res.redirect(redirectUrl.toString());
      return;
    }

    // No redirect_uri - redirect to test page to show auth success
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Redirecting to test page after successful OAuth',
      sessionId,
      userEmail: userInfo.email,
    }));

    // Phase 5.1 - Week 2, Task 2.4: Prometheus Metrics (Issue #9)
    oauth_requests_total.inc({ status: 'success', flow_type: 'legacy' });

    res.redirect('/test');
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'OAuth callback failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }));

    // Phase 5.1 - Week 2, Task 2.4: Prometheus Metrics (Issue #9)
    // Track OAuth failure (use pkce as default for catch-all errors)
    oauth_requests_total.inc({ status: 'failure', flow_type: 'pkce' });

    // Phase 5.2 - XSS Protection: Use safe HTML rendering
    res.status(500).send(
      renderSafeErrorPage(
        'Authentication Failed',
        'Authentication Failed',
        'An error occurred during authentication.',
        error instanceof Error ? `<p><small>Error: ${error.message}</small></p>` : undefined
      )
    );
  }
}

/**
 * GET /auth/status
 *
 * Check current authentication status
 */
export async function handleAuthStatus(req: Request, res: Response): Promise<void> {
  try {
    const sessionId = req.cookies[COOKIE_NAME];

    if (!sessionId) {
      res.json({
        authenticated: false,
        message: 'No session cookie found',
      });
      return;
    }

    const session = await sessionManager.getSession(sessionId);

    if (!session) {
      res.json({
        authenticated: false,
        message: 'Session expired or invalid',
      });
      return;
    }

    res.json({
      authenticated: session.authenticated,
      sessionId: session.id,
      userEmail: session.userEmail,
      expiresAt: new Date(session.expiresAt).toISOString(),
      lastAccessedAt: new Date(session.lastAccessedAt).toISOString(),
    });
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Auth status check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }));

    res.status(500).json({
      error: 'Failed to check authentication status',
    });
  }
}

/**
 * POST /auth/logout
 *
 * Logout and destroy session
 */
export async function handleLogout(req: Request, res: Response): Promise<void> {
  try {
    const sessionId = req.cookies[COOKIE_NAME];

    if (sessionId) {
      await sessionManager.deleteSession(sessionId);
      res.clearCookie(COOKIE_NAME);

      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'User logged out',
        sessionId,
      }));
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Logout failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }));

    res.status(500).json({
      error: 'Failed to logout',
    });
  }
}
