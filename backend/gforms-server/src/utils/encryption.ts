/**
 * Token Encryption Utility
 *
 * Provides AES-256-GCM encryption/decryption for sensitive data stored in Redis.
 * This prevents token exposure if Redis is compromised or accessed by unauthorized users.
 *
 * Phase 5.1 - Week 1, Task 1.2: AWS Secrets Manager Integration (COMPLETED)
 */

import crypto from 'crypto';
import type { OAuthTokens } from '../session/types.js';
import { getEncryptionKey as getEncryptionKeyFromSecretsManager } from './secrets-manager.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits for GCM auth tag
const KEY_LENGTH = 32; // 256 bits for AES-256

/**
 * Get the encryption key from AWS Secrets Manager
 * Falls back to environment variable in development
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
 *
 * @param plaintext - The data to encrypt
 * @returns Base64-encoded string containing IV + auth tag + ciphertext
 */
export async function encrypt(plaintext: string): Promise<string> {
  try {
    const key = await getEncryptionKey();

    // Generate a random IV for each encryption (never reuse IVs with GCM)
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt the data
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    // Get the authentication tag (GCM provides authenticated encryption)
    const authTag = cipher.getAuthTag();

    // Combine IV + auth tag + encrypted data into a single buffer
    const combined = Buffer.concat([iv, authTag, encrypted]);

    // Return as base64 for easy storage
    return combined.toString('base64');
  } catch (error) {
    throw new Error(
      `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Decrypt data encrypted with AES-256-GCM
 *
 * @param ciphertext - Base64-encoded string containing IV + auth tag + ciphertext
 * @returns The decrypted plaintext
 */
export async function decrypt(ciphertext: string): Promise<string> {
  try {
    const key = await getEncryptionKey();

    // Decode from base64
    const combined = Buffer.from(ciphertext, 'base64');

    // Extract IV, auth tag, and encrypted data
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt the data
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
 * This is a utility function for key generation
 *
 * @returns A hex-encoded 256-bit encryption key
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Encrypt an OAuth token object for storage in Redis
 *
 * @param tokens - The OAuth tokens to encrypt
 * @returns Base64-encoded encrypted token data
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
 *
 * @param encryptedData - Base64-encoded encrypted token data
 * @returns The decrypted token object
 */
export async function decryptTokens(encryptedData: string): Promise<OAuthTokens> {
  const plaintext = await decrypt(encryptedData);
  return JSON.parse(plaintext) as OAuthTokens;
}
