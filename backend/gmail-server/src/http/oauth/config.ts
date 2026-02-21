/**
 * Gmail OAuth Configuration
 */

import { google, type Auth } from 'googleapis';

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://mail.google.com/',
];

/**
 * Create an OAuth2 client instance
 */
export function createOAuth2Client(
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Auth.OAuth2Client {
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}
