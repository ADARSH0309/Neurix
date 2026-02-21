/**
 * OAuth Auth Routes
 */

import type { Request, Response } from 'express';
import type { Auth } from 'googleapis';
import fs from 'fs/promises';
import { GmailClient } from '../../gmail-client.js';
import { GMAIL_SCOPES } from '../oauth/config.js';

type OAuth2Client = Auth.OAuth2Client;

interface AuthHandlerDeps {
  oauth2Client: OAuth2Client;
  gmailClient: GmailClient;
  tokenPath: string;
  setAuthenticated: (value: boolean) => void;
  getPendingRedirectUri: () => string | null;
  setPendingRedirectUri: (uri: string | null) => void;
}

export function createLoginHandler(deps: AuthHandlerDeps) {
  return (req: Request, res: Response): void => {
    const frontendRedirect = req.query.redirect_uri as string | undefined;
    if (frontendRedirect) {
      deps.setPendingRedirectUri(frontendRedirect);
    }

    const authUrl = deps.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: GMAIL_SCOPES,
      prompt: 'consent',
    });
    res.redirect(authUrl);
  };
}

export function createCallbackHandler(deps: AuthHandlerDeps) {
  return async (req: Request, res: Response): Promise<void> => {
    const code = req.query.code as string;
    const error = req.query.error as string;

    if (error) {
      res.status(400).send(`
        <html>
          <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
            <div style="text-align: center;">
              <h1 style="color: #dc3545;">Authentication Failed</h1>
              <p>Error: ${error}</p>
            </div>
          </body>
        </html>
      `);
      return;
    }

    if (!code) {
      res.status(400).send('No authorization code received');
      return;
    }

    try {
      const { tokens } = await deps.oauth2Client.getToken(code);
      deps.oauth2Client.setCredentials(tokens);
      await fs.writeFile(deps.tokenPath, JSON.stringify(tokens, null, 2));

      // Reinitialize client with new tokens
      await deps.gmailClient.initialize();
      deps.setAuthenticated(true);

      // Redirect back to the frontend if a redirect URI was provided
      const pendingRedirect = deps.getPendingRedirectUri();
      if (pendingRedirect) {
        deps.setPendingRedirectUri(null);
        const separator = pendingRedirect.includes('?') ? '&' : '?';
        res.redirect(`${pendingRedirect}${separator}access_token=${encodeURIComponent(tokens.access_token || '')}&server=gmail`);
        return;
      }

      res.send(`
        <html>
          <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <div style="text-align: center; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
              <div style="font-size: 64px; margin-bottom: 20px;">&#x2705;</div>
              <h1 style="color: #28a745; margin: 0 0 10px 0;">Authentication Successful!</h1>
              <p style="color: #666; margin: 0;">Gmail MCP Server is now connected.</p>
              <p style="color: #999; margin-top: 20px; font-size: 14px;">You can close this window.</p>
            </div>
          </body>
        </html>
      `);
    } catch (err) {
      console.error('OAuth callback error:', err);
      res.status(500).send('Authentication failed');
    }
  };
}
