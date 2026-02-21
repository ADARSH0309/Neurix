/**
 * OAuth Routes for Google Calendar
 */

import type { Request, Response } from 'express';
import { OAuthClientManager } from './client.js';
import { sessionManager } from '../../session/index.js';
import { authorizationCodeManager } from './authorization-code-manager.js';
import type { OAuthConfig } from './types.js';
import { renderSafeErrorPage, renderSafeSuccessPage } from '../../utils/html-sanitizer.js';
import { isRedirectUriAllowed, logRedirectUriWhitelist } from './redirect-validator.js';
import { oauth_requests_total } from '../metrics/prometheus.js';

const COOKIE_NAME = 'neurix_gcalendar_session';
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
      res.status(400).json({ error: 'invalid_request', error_description: 'redirect_uri is not whitelisted' });
      return;
    }

    const isPKCEFlow = Boolean(clientId && redirectUri && codeChallenge);

    const session = await sessionManager.createSession({
      metadata: { userAgent: req.headers['user-agent'], ipAddress: req.ip, redirectUri, isPKCEFlow },
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
    }

    res.cookie(COOKIE_NAME, session.id, COOKIE_OPTIONS);
    const authUrl = oauthClient.generateAuthUrl(session.id);
    res.redirect(authUrl);
  } catch (error) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: 'error', message: 'OAuth login failed', error: error instanceof Error ? error.message : 'Unknown error' }));
    res.status(500).json({ error: 'Failed to initiate OAuth flow', message: error instanceof Error ? error.message : 'Unknown error' });
  }
}

export async function handleOAuthCallback(req: Request, res: Response): Promise<void> {
  try {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      oauth_requests_total.inc({ status: 'failure', flow_type: 'pkce' });
      res.status(400).send(renderSafeErrorPage('Authentication Failed', 'Authentication Failed', `An error occurred during authentication: ${oauthError}`));
      return;
    }

    const sessionId = state as string;
    const session = await sessionManager.getSession(sessionId);

    if (!session) {
      oauth_requests_total.inc({ status: 'failure', flow_type: 'pkce' });
      res.status(400).send(renderSafeErrorPage('Session Expired', 'Authentication Failed', 'Session expired or invalid. Please try again.'));
      return;
    }

    const tokens = await oauthClient.exchangeCodeForTokens(code as string);
    const userInfo = await oauthClient.getUserInfo(tokens.access_token);

    await sessionManager.storeTokens(sessionId, tokens, userInfo.email);
    res.cookie(COOKIE_NAME, sessionId, COOKIE_OPTIONS);

    const isPKCEFlow = session.metadata?.isPKCEFlow;

    if (isPKCEFlow) {
      const authzRequest = await authorizationCodeManager.getAuthorizationRequest(sessionId);
      if (!authzRequest) {
        oauth_requests_total.inc({ status: 'failure', flow_type: 'pkce' });
        res.status(400).send(renderSafeErrorPage('Authorization Failed', 'Authorization Failed', 'Session expired or invalid. Please try again.'));
        return;
      }

      if (!isRedirectUriAllowed(authzRequest.redirect_uri)) {
        oauth_requests_total.inc({ status: 'failure', flow_type: 'pkce' });
        res.status(400).send(renderSafeErrorPage('Invalid Redirect', 'Authorization Failed', 'Redirect URI is not whitelisted for security reasons.'));
        return;
      }

      const authorizationCode = await authorizationCodeManager.generateAuthorizationCode(
        authzRequest.client_id, authzRequest.redirect_uri, authzRequest.code_challenge,
        'S256', userInfo.email, tokens.access_token, tokens.refresh_token, authzRequest.state
      );

      await authorizationCodeManager.deleteAuthorizationRequest(sessionId);

      const redirectUrl = new URL(authzRequest.redirect_uri);
      redirectUrl.searchParams.set('code', authorizationCode);
      if (authzRequest.state) redirectUrl.searchParams.set('state', authzRequest.state);

      oauth_requests_total.inc({ status: 'success', flow_type: 'pkce' });
      res.redirect(redirectUrl.toString());
      return;
    }

    const redirectUri = session.metadata?.redirectUri;
    if (redirectUri && typeof redirectUri === 'string') {
      if (!isRedirectUriAllowed(redirectUri)) {
        oauth_requests_total.inc({ status: 'failure', flow_type: 'legacy' });
        res.status(400).send(renderSafeErrorPage('Invalid Redirect', 'Authorization Failed', 'Redirect URI is not whitelisted for security reasons.'));
        return;
      }

      const { tokenManager } = await import('../auth/token-manager.js');
      const bearerToken = await tokenManager.generateToken(sessionId);

      oauth_requests_total.inc({ status: 'success', flow_type: 'legacy' });
      const redirectUrl = new URL(redirectUri);
      redirectUrl.searchParams.set('access_token', bearerToken);
      redirectUrl.searchParams.set('token_type', 'Bearer');
      res.redirect(redirectUrl.toString());
      return;
    }

    oauth_requests_total.inc({ status: 'success', flow_type: 'legacy' });
    res.redirect('/test');
  } catch (error) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: 'error', message: 'OAuth callback failed', error: error instanceof Error ? error.message : 'Unknown error' }));
    oauth_requests_total.inc({ status: 'failure', flow_type: 'pkce' });
    res.status(500).send(renderSafeErrorPage('Authentication Failed', 'Authentication Failed', 'An error occurred during authentication.', error instanceof Error ? `<p><small>Error: ${error.message}</small></p>` : undefined));
  }
}

export async function handleAuthStatus(req: Request, res: Response): Promise<void> {
  try {
    const sessionId = req.cookies[COOKIE_NAME];
    if (!sessionId) { res.json({ authenticated: false, message: 'No session cookie found' }); return; }
    const session = await sessionManager.getSession(sessionId);
    if (!session) { res.json({ authenticated: false, message: 'Session expired or invalid' }); return; }
    res.json({ authenticated: session.authenticated, sessionId: session.id, userEmail: session.userEmail, expiresAt: new Date(session.expiresAt).toISOString(), lastAccessedAt: new Date(session.lastAccessedAt).toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check authentication status' });
  }
}

export async function handleLogout(req: Request, res: Response): Promise<void> {
  try {
    const sessionId = req.cookies[COOKIE_NAME];
    if (sessionId) {
      await sessionManager.deleteSession(sessionId);
      res.clearCookie(COOKIE_NAME);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to logout' });
  }
}
