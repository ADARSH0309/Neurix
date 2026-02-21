import { Request, Response } from 'express';
import { getRedisClient } from '../../session/redis-client.js';
import { getEncryptionKey } from '../../utils/secrets-manager.js';
import { redisHealthTracker } from '../../session/redis-health.js';

/**
 * Dependency Health Status
 */
interface DependencyStatus {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  error?: string;
  details?: Record<string, unknown>;
}

/**
 * Overall Health Status
 */
interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  server: string;
  version: string;
  transport: string;
  uptime: number;
  environment: string;
  dependencies: DependencyStatus[];
}

/**
 * Check Redis connectivity
 *
 * Phase 5.1 - Week 1, Task 1.5: Health Check with Dependency Validation
 * Phase 5.1 - Week 3, Task 3.5: Graceful Degradation (Issue #15)
 */
async function checkRedis(): Promise<DependencyStatus> {
  const startTime = Date.now();

  try {
    const redis = getRedisClient();

    // Get health tracker status for graceful degradation info
    const healthStatus = redisHealthTracker.getStatus();

    // Try a PING command with timeout
    const pingResult = await Promise.race([
      redis.ping(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Redis ping timeout')), 5000)
      )
    ]);

    const responseTime = Date.now() - startTime;

    if (pingResult === 'PONG') {
      return {
        name: 'redis',
        status: 'healthy',
        responseTime,
        details: {
          connected: true,
          mode: process.env.NODE_ENV === 'production' ? 'tls' : 'standard',
          // Phase 5.1 - Week 3, Task 3.5: Include health tracking status
          healthTracking: healthStatus,
        },
      };
    }

    return {
      name: 'redis',
      status: healthStatus.status === 'degraded' ? 'degraded' : 'unhealthy',
      responseTime,
      error: 'Redis ping returned unexpected response',
      details: {
        // Phase 5.1 - Week 3, Task 3.5: Include resilience features
        healthTracking: healthStatus,
        gracefulDegradation: 'Offline queue and retry strategy active',
      },
    };
  } catch (error) {
    // Phase 5.1 - Week 3, Task 3.5: Report degraded status if resilience features active
    const healthStatus = redisHealthTracker.getStatus();

    return {
      name: 'redis',
      status: healthStatus.status === 'degraded' ? 'degraded' : 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown Redis error',
      details: {
        // Phase 5.1 - Week 3, Task 3.5: Include health tracking and resilience info
        healthTracking: healthStatus,
        gracefulDegradation: healthStatus.features.offlineQueue
          ? 'Offline queue active, commands will be queued and retried'
          : 'No graceful degradation available',
      },
    };
  }
}

/**
 * Check AWS Secrets Manager access
 *
 * Phase 5.1 - Week 1, Task 1.5: Health Check with Dependency Validation
 */
async function checkSecretsManager(): Promise<DependencyStatus> {
  const startTime = Date.now();

  // Skip in development if ENCRYPTION_KEY is set via environment
  if (process.env.NODE_ENV !== 'production' && process.env.ENCRYPTION_KEY) {
    return {
      name: 'secrets_manager',
      status: 'healthy',
      responseTime: 0,
      details: {
        mode: 'environment_variable',
        note: 'Using ENCRYPTION_KEY environment variable in development',
      },
    };
  }

  try {
    // Try to get encryption key with timeout
    const encryptionKey = await Promise.race([
      getEncryptionKey(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Secrets Manager timeout')), 5000)
      )
    ]);

    const responseTime = Date.now() - startTime;

    if (encryptionKey && encryptionKey.length > 0) {
      return {
        name: 'secrets_manager',
        status: 'healthy',
        responseTime,
        details: {
          mode: 'aws_secrets_manager',
          keyLength: encryptionKey.length,
        },
      };
    }

    return {
      name: 'secrets_manager',
      status: 'unhealthy',
      responseTime,
      error: 'Encryption key is empty or invalid',
    };
  } catch (error) {
    return {
      name: 'secrets_manager',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown Secrets Manager error',
    };
  }
}

/**
 * Check environment configuration
 *
 * Phase 5.1 - Week 1, Task 1.5: Health Check with Dependency Validation
 */
function checkEnvironment(): DependencyStatus {
  const requiredEnvVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    return {
      name: 'environment',
      status: 'unhealthy',
      error: `Missing required environment variables: ${missingVars.join(', ')}`,
    };
  }

  // Check optional but recommended variables
  const recommendedVars = ['SERVER_URL', 'NODE_ENV'];
  const missingRecommended = recommendedVars.filter(varName => !process.env[varName]);

  if (missingRecommended.length > 0) {
    return {
      name: 'environment',
      status: 'degraded',
      details: {
        missing_recommended: missingRecommended,
        note: 'Recommended environment variables not set',
      },
    };
  }

  return {
    name: 'environment',
    status: 'healthy',
    details: {
      node_env: process.env.NODE_ENV || 'development',
      server_url: process.env.SERVER_URL ? 'configured' : 'not_set',
    },
  };
}

/**
 * Health check endpoint with dependency validation
 *
 * Returns:
 * - 200: All dependencies healthy
 * - 503: One or more dependencies unhealthy
 * - 200: All critical dependencies healthy but some degraded (still operational)
 *
 * Phase 5.1 - Week 1, Task 1.5: Health Check with Dependency Validation
 */
export async function handleHealthCheck(req: Request, res: Response): Promise<void> {
  try {
    // Run all dependency checks in parallel
    const [redisStatus, secretsStatus, envStatus] = await Promise.all([
      checkRedis(),
      checkSecretsManager(),
      checkEnvironment(),
    ]);

    const dependencies = [redisStatus, secretsStatus, envStatus];

    // Determine overall status
    const hasUnhealthy = dependencies.some(dep => dep.status === 'unhealthy');
    const hasDegraded = dependencies.some(dep => dep.status === 'degraded');

    let overallStatus: 'healthy' | 'unhealthy' | 'degraded';
    let httpStatus: number;

    if (hasUnhealthy) {
      overallStatus = 'unhealthy';
      httpStatus = 503; // Service Unavailable
    } else if (hasDegraded) {
      overallStatus = 'degraded';
      httpStatus = 200; // Still operational
    } else {
      overallStatus = 'healthy';
      httpStatus = 200;
    }

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      server: 'gmail-mcp-server',
      version: '1.0.0',
      transport: 'http',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      dependencies,
    };

    // Log unhealthy status for monitoring
    if (hasUnhealthy) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Health check failed - unhealthy dependencies',
        unhealthy: dependencies.filter(d => d.status === 'unhealthy').map(d => d.name),
      }));
    }

    res.status(httpStatus).json(healthStatus);
  } catch (error) {
    // Critical error during health check
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Health check endpoint failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }));

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      server: 'gmail-mcp-server',
      version: '1.0.0',
      transport: 'http',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      error: error instanceof Error ? error.message : 'Health check failed',
      dependencies: [],
    });
  }
}
