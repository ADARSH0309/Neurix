/**
 * AWS Secrets Manager Integration
 *
 * Provides secure access to secrets stored in AWS Secrets Manager with caching.
 */

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

interface SecretCacheEntry {
  value: string;
  expiresAt: number;
}

const secretCache = new Map<string, SecretCacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get a secret from AWS Secrets Manager with caching
 */
export async function getSecret(secretName: string): Promise<string> {
  const cached = secretCache.get(secretName);
  if (cached && cached.expiresAt > Date.now()) {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'debug',
        message: 'Secret retrieved from cache',
        secretName,
      })
    );
    return cached.value;
  }

  try {
    const command = new GetSecretValueCommand({
      SecretId: secretName,
    });

    const response = await client.send(command);

    if (!response.SecretString) {
      throw new Error(`Secret ${secretName} has no string value`);
    }

    secretCache.set(secretName, {
      value: response.SecretString,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Secret retrieved from AWS Secrets Manager',
        secretName,
      })
    );

    return response.SecretString;
  } catch (error) {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Failed to retrieve secret from AWS Secrets Manager',
        secretName,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    );

    throw new Error(
      `Failed to retrieve secret ${secretName}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get the encryption key from AWS Secrets Manager
 */
export async function getEncryptionKey(): Promise<string> {
  const secretName = process.env.AWS_SECRET_NAME || 'gcalendar-mcp/encryption-key';

  // Fallback to environment variable if not in production
  if (process.env.NODE_ENV !== 'production' && process.env.ENCRYPTION_KEY) {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: 'Using ENCRYPTION_KEY from environment (development mode)',
      })
    );

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'security',
      event: 'encryption_key_accessed',
      source: 'environment_variable',
      success: true,
    }));

    return process.env.ENCRYPTION_KEY;
  }

  try {
    const secretString = await getSecret(secretName);
    const secret = JSON.parse(secretString);

    if (!secret.key || typeof secret.key !== 'string') {
      throw new Error('Secret does not contain a valid "key" field');
    }

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'security',
      event: 'encryption_key_accessed',
      source: 'aws_secrets_manager',
      secretName,
      success: true,
    }));

    return secret.key;
  } catch (error) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'security',
      event: 'encryption_key_accessed',
      source: 'aws_secrets_manager',
      secretName,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }));

    if (process.env.NODE_ENV !== 'production' && process.env.ENCRYPTION_KEY) {
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'warn',
          message: 'AWS Secrets Manager unavailable, falling back to ENCRYPTION_KEY',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      );

      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'security',
        event: 'encryption_key_accessed',
        source: 'environment_variable_fallback',
        success: true,
      }));

      return process.env.ENCRYPTION_KEY;
    }

    throw error;
  }
}

/**
 * Clear the secret cache
 */
export function clearSecretCache(): void {
  secretCache.clear();
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Secret cache cleared',
    })
  );
}

/**
 * Get cache statistics
 */
export function getSecretCacheStats(): {
  size: number;
  entries: Array<{ secretName: string; expiresAt: number }>;
} {
  return {
    size: secretCache.size,
    entries: Array.from(secretCache.entries()).map(([secretName, entry]) => ({
      secretName,
      expiresAt: entry.expiresAt,
    })),
  };
}
