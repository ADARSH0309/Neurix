/**
 * OAuth Client
 *
 * Handles Google OAuth 2.0 flow for Google Forms API access.
 */

import { google, type Auth } from 'googleapis';
import type { OAuthConfig, OAuthTokenResponse, UserInfo } from './types.js';

type OAuth2Client = Auth.OAuth2Client;

export class OAuthClientManager {
  private oauth2Client: OAuth2Client;

  constructor(config: OAuthConfig) {
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
  }

  /**
   * Generate OAuth authorization URL
   */
  generateAuthUrl(state: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // Get refresh token
      scope: [
        'https://www.googleapis.com/auth/forms.body',           // Full read/write access to forms
        'https://www.googleapis.com/auth/forms.responses.readonly', // Read responses
        'https://www.googleapis.com/auth/drive.file',           // Create/access files created by this app
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      state,
      prompt: 'consent', // Force consent to always get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<OAuthTokenResponse> {
    const { tokens } = await this.oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Missing access_token or refresh_token in OAuth response');
    }

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      scope: tokens.scope || '',
      token_type: tokens.token_type || 'Bearer',
      expiry_date: tokens.expiry_date || Date.now() + 3600 * 1000,
    };
  }

  /**
   * Get user info from Google
   */
  async getUserInfo(accessToken: string): Promise<UserInfo> {
    this.oauth2Client.setCredentials({ access_token: accessToken });

    const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
    const { data } = await oauth2.userinfo.get();

    if (!data.email) {
      throw new Error('Failed to retrieve user email from Google');
    }

    return {
      email: data.email,
      emailVerified: data.verified_email || false,
      name: data.name || undefined,
      picture: data.picture || undefined,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });

    const { credentials } = await this.oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      throw new Error('Failed to refresh access token');
    }

    return {
      access_token: credentials.access_token,
      refresh_token: refreshToken, // Keep existing refresh token
      scope: credentials.scope || '',
      token_type: credentials.token_type || 'Bearer',
      expiry_date: credentials.expiry_date || Date.now() + 3600 * 1000,
    };
  }

  /**
   * Verify token is valid
   */
  async verifyToken(accessToken: string): Promise<boolean> {
    try {
      this.oauth2Client.setCredentials({ access_token: accessToken });
      const tokenInfo = await this.oauth2Client.getTokenInfo(accessToken);
      return !!tokenInfo.email;
    } catch (error) {
      return false;
    }
  }
}
