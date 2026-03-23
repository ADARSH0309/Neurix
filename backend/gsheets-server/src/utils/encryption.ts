/**
 * Token Encryption Utility
 *
 * Provides AES-256-GCM encryption/decryption for sensitive data stored in Redis.
 */

import crypto from 'crypto';
import type { OAuthTokens } from '../session/types.js';
import { getEncryptionKey as getEncryptionKeyFromSecretsManager } from './secrets-manager.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Get the encryption key from AWS Secrets Manager
 */
async function getEncryptionKey(): Promise<Buffer> {
  const keyHex = await getEncryptionKeyFromSecretsManager();

  if (!keyHex) {
    throw new Error(
      'ENCRYPTION_KEY not available from AWS Secrets Manager or environment. ' +
      'Generate one with: openssl rand -hex 32'
    );
  }

  const key = Buffer.from(keyHex, 'hex');

  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `ENCRYPTION_KEY must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} hex characters). ` +
      `Received ${key.length} bytes.`
    );
  }

  return key;
}

/**
 * Encrypt data using AES-256-GCM
 */
export async function encrypt(plaintext: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();
    const combined = Buffer.concat([iv, authTag, encrypted]);

    return combined.toString('base64');
  } catch (error) {
    throw new Error(
      `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Decrypt data encrypted with AES-256-GCM
 */
export async function decrypt(ciphertext: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const combined = Buffer.from(ciphertext, 'base64');

    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    throw new Error(
      `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate a new encryption key
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Encrypt OAuth tokens for storage in Redis
 */
export async function encryptTokens(tokens: {
  access_token: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  expiry_date?: number;
}): Promise<string> {
  const plaintext = JSON.stringify(tokens);
  return await encrypt(plaintext);
}

/**
 * Decrypt OAuth tokens retrieved from Redis
 */
export async function decryptTokens(encryptedData: string): Promise<OAuthTokens> {
  const plaintext = await decrypt(encryptedData);
  return JSON.parse(plaintext) as OAuthTokens;
}
