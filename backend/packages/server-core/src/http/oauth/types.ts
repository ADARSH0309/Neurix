/**
 * OAuth Flow Types
 */

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

export interface UserInfo {
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}
