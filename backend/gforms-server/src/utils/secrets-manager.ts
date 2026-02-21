/**
 * AWS Secrets Manager Integration
 *
 * Provides secure access to secrets stored in AWS Secrets Manager with caching.
 *
 * Phase 5.1 - Week 1, Task 1.2: AWS Secrets Manager Integration
 *
 * Security Benefits:
 * - Removes hardcoded secrets from environment variables
 * - Enables secret rotation without application restart
 * - Provides audit trail for secret access
 * - Enforces IAM-based access control
 */

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

/**
 * AWS Secrets Manager client configuration
 * Uses IAM role credentials from ECS task in production
 */
const client = new SecretsManagerClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

/**
 * Secret cache with TTL to reduce AWS API calls
 * Cache duration: 5 minutes (300000ms)
 */
interface SecretCacheEntry {
  value: string;
  expiresAt: number;
}

const secretCache = new Map<string, SecretCacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get a secret from AWS Secrets Manager with caching
 *
 * @param secretName - The name or ARN of the secret in AWS Secrets Manager
 * @returns The decrypted secret value
 * @throws Error if secret retrieval fails
 */
export async function getSecret(secretName: string): Promise<string> {
  // Check cache first
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
    // Fetch from AWS Secrets Manager
    const command = new GetSecretValueCommand({
      SecretId: secretName,
    });

    const response = await client.send(command);

    if (!response.SecretString) {
      throw new Error(`Secret ${secretName} has no string value`);
    }

    // Cache the secret
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
 *
 * Expected secret format in AWS Secrets Manager:
 * - Secret name: gmail-mcp/encryption-key
 * - Secret value: {"key": "hex-encoded-256-bit-key"}
 *
 * Fallback: If AWS_SECRET_NAME is not set, uses ENCRYPTION_KEY environment variable
 *
 * @returns The encryption key as a hex string
 * @throws Error if key retrieval fails
 */
export async function getEncryptionKey(): Promise<string> {
  const secretName = process.env.AWS_SECRET_NAME || 'gmail-mcp/encryption-key';

  // Fallback to environment variable if not in production
  if (process.env.NODE_ENV !== 'production' && process.env.ENCRYPTION_KEY) {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: 'Using ENCRYPTION_KEY from environment (development mode)',
      })
    );

    // Phase 5.1 - Week 2, Task 2.2: Security Audit Logging (Issue #7)
    // Security audit log for encryption key access
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

    // Parse secret JSON
    const secret = JSON.parse(secretString);

    if (!secret.key || typeof secret.key !== 'string') {
      throw new Error('Secret does not contain a valid "key" field');
    }

    // Phase 5.1 - Week 2, Task 2.2: Security Audit Logging (Issue #7)
    // Security audit log for encryption key access from AWS Secrets Manager
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
    // Phase 5.1 - Week 2, Task 2.2: Security Audit Logging (Issue #7)
    // Security audit log for failed encryption key access
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'security',
      event: 'encryption_key_accessed',
      source: 'aws_secrets_manager',
      secretName,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }));

    // If secret doesn't exist and we're in development, fall back to env var
    if (process.env.NODE_ENV !== 'production' && process.env.ENCRYPTION_KEY) {
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'warn',
          message: 'AWS Secrets Manager unavailable, falling back to ENCRYPTION_KEY',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      );

      // Security audit log for fallback to environment variable
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
 * Useful for testing or forcing a refresh
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
 * Get cache statistics (for monitoring/debugging)
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
