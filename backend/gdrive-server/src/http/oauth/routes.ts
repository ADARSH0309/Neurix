/**
 * OAuth Routes for Google Drive
 */

import type { Request, Response } from 'express';
import { OAuthClientManager } from './client.js';
import { sessionManager } from '../../session/index.js';
import { authorizationCodeManager } from './authorization-code-manager.js';
import type { OAuthConfig } from './types.js';
import { renderSafeErrorPage, renderSafeSuccessPage } from '../../utils/html-sanitizer.js';
import { isRedirectUriAllowed, logRedirectUriWhitelist } from './redirect-validator.js';
import { oauth_requests_total } from '../metrics/prometheus.js';

const COOKIE_NAME = 'neurix_gdrive_session';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'none' as const,
  maxAge: 24 * 60 * 60 * 1000,
  domain: process.env.COOKIE_DOMAIN,
  path: '/',
};

let oauthClient: OAuthClientManager;

export function initializeOAuthClient(config: OAuthConfig): void {
  oauthClient = new OAuthClientManager(config);
  logRedirectUriWhitelist();
}

export async function handleLogin(req: Request, res: Response): Promise<void> {
  try {
    const redirectUri = typeof req.query.redirect_uri === 'string' ? req.query.redirect_uri : undefined;
    const clientId = typeof req.query.client_id === 'string' ? req.query.client_id : undefined;
    const codeChallenge = typeof req.query.code_challenge === 'string' ? req.query.code_challenge : undefined;
    const codeChallengeMethod = typeof req.query.code_challenge_method === 'string' ? req.query.code_challenge_method : undefined;
    const state = typeof req.query.state === 'string' ? req.query.state : undefined;
    const responseType = typeof req.query.response_type === 'string' ? req.query.response_type : undefined;

    if (redirectUri && !(await isRedirectUriAllowed(redirectUri, clientId))) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'OAuth login rejected: redirect_uri not in whitelist',
        redirectUri,
        clientId,
        ip: req.ip,
      }));

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

    const isPKCEFlow = Boolean(clientId && redirectUri && codeChallenge);

    const session = await sessionManager.createSession({
      metadata: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        redirectUri,
        isPKCEFlow,
      },
    });

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

    res.cookie(COOKIE_NAME, session.id, COOKIE_OPTIONS);
    const authUrl = oauthClient.generateAuthUrl(session.id);
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

export async function handleOAuthCallback(req: Request, res: Response): Promise<void> {
  try {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'OAuth error from Google',
        error: oauthError,
      }));

      oauth_requests_total.inc({ status: 'failure', flow_type: 'pkce' });

      res.status(400).send(
        renderSafeErrorPage(
          'Authentication Failed',
          'Authentication Failed',
          `An error occurred during authentication: ${oauthError}`
        )
      );
      return;
    }

    const sessionId = state as string;
    const session = await sessionManager.getSession(sessionId);

    if (!session) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Invalid or expired session in OAuth callback',
        sessionId,
      }));

      oauth_requests_total.inc({ status: 'failure', flow_type: 'pkce' });

      res.status(400).send(
        renderSafeErrorPage(
          'Session Expired',
          'Authentication Failed',
          'Session expired or invalid. Please try again.'
        )
      );
      return;
    }

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Exchanging OAuth code for tokens',
      sessionId,
    }));

    const tokens = await oauthClient.exchangeCodeForTokens(code as string);
    const userInfo = await oauthClient.getUserInfo(tokens.access_token);

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'OAuth tokens received',
      sessionId,
      userEmail: userInfo.email,
    }));

    await sessionManager.storeTokens(sessionId, tokens, userInfo.email);
    res.cookie(COOKIE_NAME, sessionId, COOKIE_OPTIONS);

    const isPKCEFlow = session.metadata?.isPKCEFlow;

    if (isPKCEFlow) {
      const authzRequest = await authorizationCodeManager.getAuthorizationRequest(sessionId);

      if (!authzRequest) {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: 'Authorization request not found for PKCE flow',
          sessionId,
        }));

        oauth_requests_total.inc({ status: 'failure', flow_type: 'pkce' });

        res.status(400).send(
          renderSafeErrorPage(
            'Authorization Failed',
            'Authorization Failed',
            'Session expired or invalid. Please try again.'
          )
        );
        return;
      }

      if (!isRedirectUriAllowed(authzRequest.redirect_uri)) {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: 'OAuth callback rejected: redirect_uri not in whitelist',
          redirectUri: authzRequest.redirect_uri,
          sessionId,
        }));

        oauth_requests_total.inc({ status: 'failure', flow_type: 'pkce' });

        res.status(400).send(
          renderSafeErrorPage(
            'Invalid Redirect',
            'Authorization Failed',
            'Redirect URI is not whitelisted for security reasons.'
          )
        );
        return;
      }

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

      await authorizationCodeManager.deleteAuthorizationRequest(sessionId);

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

      oauth_requests_total.inc({ status: 'success', flow_type: 'pkce' });

      res.redirect(redirectUrl.toString());
      return;
    }

    const redirectUri = session.metadata?.redirectUri;

    if (redirectUri && typeof redirectUri === 'string') {
      if (!isRedirectUriAllowed(redirectUri)) {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: 'OAuth callback rejected: redirect_uri not in whitelist (legacy flow)',
          redirectUri,
          sessionId,
        }));

        oauth_requests_total.inc({ status: 'failure', flow_type: 'legacy' });

        res.status(400).send(
          renderSafeErrorPage(
            'Invalid Redirect',
            'Authorization Failed',
            'Redirect URI is not whitelisted for security reasons.'
          )
        );
        return;
      }

      const { tokenManager } = await import('../auth/token-manager.js');
      const bearerToken = await tokenManager.generateToken(sessionId);

      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Redirecting to original source after OAuth success (legacy flow)',
        sessionId,
        redirectUri,
        bearerTokenGenerated: true,
      }));

      oauth_requests_total.inc({ status: 'success', flow_type: 'legacy' });

      const redirectUrl = new URL(redirectUri);
      redirectUrl.searchParams.set('access_token', bearerToken);
      redirectUrl.searchParams.set('token_type', 'Bearer');

      res.redirect(redirectUrl.toString());
      return;
    }

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Redirecting to test page after successful OAuth',
      sessionId,
      userEmail: userInfo.email,
    }));

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

    oauth_requests_total.inc({ status: 'failure', flow_type: 'pkce' });

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
