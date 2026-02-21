/**
 * Rate Limiting Middleware (Phase 4.1 - Bug #1 Fixed)
 *
 * Implements rate limiting using express-rate-limit with custom IORedis store
 * to protect against brute-force attacks and API abuse.
 *
 * Bug Fix: Replaced dual Redis clients (node-redis + ioredis) with single ioredis
 * client shared across the entire application. This eliminates:
 * - Duplicate Redis connections
 * - Top-level await (which can crash in certain module loading scenarios)
 * - Library incompatibility issues
 *
 * RFC References:
 * - RFC 6585: Additional HTTP Status Codes (429 Too Many Requests)
 */

import rateLimit from 'express-rate-limit';
import { IORedisStore } from './redis-rate-limit-store.js';
// Phase 5.1 - Week 2, Task 2.4: Prometheus Metrics (Issue #9)
import { rate_limit_hits_total } from '../metrics/prometheus.js';

/**
 * Rate Limiter for Authentication Endpoints
 *
 * Limits: 10 requests per 15 minutes
 * Applies to: /auth/login, /oauth2callback
 * Purpose: Prevent brute-force OAuth attacks
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per window
  skipSuccessfulRequests: true, // Don't count successful OAuth flows
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  store: new IORedisStore({
    prefix: 'rl:auth:',
  }),
  handler: (req, res) => {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: 'Authentication rate limit exceeded',
        ip: req.ip,
        path: req.path,
      })
    );

    // Phase 5.1 - Week 2, Task 2.2: Security Audit Logging (Issue #7)
    // Security audit log for rate limit violation
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'security',
      event: 'rate_limit_exceeded',
      limiter: 'auth',
      ip: req.ip,
      endpoint: req.path,
      userAgent: req.get('user-agent'),
    }));

    // Phase 5.1 - Week 2, Task 2.4: Prometheus Metrics (Issue #9)
    rate_limit_hits_total.inc({ limiter_type: 'auth' });

    res.status(429).json({
      error: 'too_many_requests',
      error_description: 'Too many authentication attempts. Account temporarily locked.',
      retry_after: '15 minutes',
    });
  },
});

/**
 * Rate Limiter for MCP JSON-RPC Endpoints
 *
 * Limits: 100 requests per 15 minutes
 * Applies to: POST /, POST /mcp/:connectionId
 * Purpose: Prevent API abuse for Gmail operations
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 MCP requests per window
  skipSuccessfulRequests: false, // Count all requests
  standardHeaders: true,
  legacyHeaders: false,
  store: new IORedisStore({
    prefix: 'rl:api:',
  }),
  handler: (req, res) => {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: 'MCP API rate limit exceeded',
        ip: req.ip,
        path: req.path,
      })
    );

    // Phase 5.1 - Week 2, Task 2.2: Security Audit Logging (Issue #7)
    // Security audit log for rate limit violation
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'security',
      event: 'rate_limit_exceeded',
      limiter: 'api',
      ip: req.ip,
      endpoint: req.path,
      userAgent: req.get('user-agent'),
    }));

    // Phase 5.1 - Week 2, Task 2.4: Prometheus Metrics (Issue #9)
    rate_limit_hits_total.inc({ limiter_type: 'api' });

    res.status(429).json({
      jsonrpc: '2.0',
      error: {
        code: -32000, // Server error
        message: 'Rate limit exceeded',
        data: {
          retryAfter: 900, // seconds
          limit: 100,
          window: '15 minutes',
        },
      },
      id: null,
    });
  },
});

/**
 * Rate Limiter for Token Generation Endpoint
 *
 * Limits: 5 requests per 15 minutes
 * Applies to: POST /api/generate-token
 * Purpose: Prevent token generation abuse
 */
export const tokenGenerationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 token generations per window
  skipSuccessfulRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
  store: new IORedisStore({
    prefix: 'rl:token:',
  }),
  handler: (req, res) => {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: 'Token generation rate limit exceeded',
        ip: req.ip,
      })
    );

    // Phase 5.1 - Week 2, Task 2.2: Security Audit Logging (Issue #7)
    // Security audit log for rate limit violation
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'security',
      event: 'rate_limit_exceeded',
      limiter: 'token_generation',
      ip: req.ip,
      endpoint: req.path,
      userAgent: req.get('user-agent'),
    }));

    // Phase 5.1 - Week 2, Task 2.4: Prometheus Metrics (Issue #9)
    rate_limit_hits_total.inc({ limiter_type: 'token' });

    res.status(429).json({
      error: 'too_many_requests',
      error_description: 'Too many token generation attempts. Please wait 15 minutes.',
      retry_after: '15 minutes',
    });
  },
});

/**
 * Rate Limiter for SSE Connections
 *
 * Limits: 10 connections per 15 minutes
 * Applies to: GET /sse, GET /sse-mcp
 * Purpose: Prevent SSE connection exhaustion
 */
export const sseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 SSE connections per window
  skipSuccessfulRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
  store: new IORedisStore({
    prefix: 'rl:sse:',
  }),
  handler: (req, res) => {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: 'SSE connection rate limit exceeded',
        ip: req.ip,
      })
    );

    // Phase 5.1 - Week 2, Task 2.2: Security Audit Logging (Issue #7)
    // Security audit log for rate limit violation
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'security',
      event: 'rate_limit_exceeded',
      limiter: 'sse',
      ip: req.ip,
      endpoint: req.path,
      userAgent: req.get('user-agent'),
    }));

    // Phase 5.1 - Week 2, Task 2.4: Prometheus Metrics (Issue #9)
    rate_limit_hits_total.inc({ limiter_type: 'sse' });

    res.status(429).json({
      error: 'too_many_requests',
      error_description: 'Too many SSE connection attempts. Please wait 15 minutes.',
      retry_after: '15 minutes',
    });
  },
});

/**
 * General Rate Limiter
 *
 * Limits: 300 requests per 15 minutes
 * Applies to: All endpoints (global fallback)
 * Purpose: Prevent general API abuse and DDoS
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per window per IP
  skipSuccessfulRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
  store: new IORedisStore({
    prefix: 'rl:general:',
  }),
  handler: (req, res) => {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: 'General rate limit exceeded',
        ip: req.ip,
        path: req.path,
      })
    );

    // Phase 5.1 - Week 2, Task 2.2: Security Audit Logging (Issue #7)
    // Security audit log for rate limit violation
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'security',
      event: 'rate_limit_exceeded',
      limiter: 'general',
      ip: req.ip,
      endpoint: req.path,
      userAgent: req.get('user-agent'),
    }));

    // Phase 5.1 - Week 2, Task 2.4: Prometheus Metrics (Issue #9)
    rate_limit_hits_total.inc({ limiter_type: 'general' });

    res.status(429).json({
      error: 'too_many_requests',
      error_description: 'Rate limit exceeded. Please slow down your requests.',
      retry_after: '15 minutes',
    });
  },
});

/**
 * Rate Limiter for GDPR Data Deletion Endpoint
 *
 * Limits: 5 requests per 15 minutes
 * Applies to: DELETE /api/gdpr/user-data
 * Purpose: Prevent abuse of GDPR Right to Erasure (Article 17)
 *
 * GDPR Article 17 requires responding to deletion requests "without undue delay",
 * but rate limiting is necessary to prevent:
 * - Repeated malicious deletion attempts
 * - Resource exhaustion from token revocation API calls
 * - Abuse of session deletion operations
 */
export const gdprDeletionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 deletion requests per window
  skipSuccessfulRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
  store: new IORedisStore({
    prefix: 'rl:gdpr:delete:',
  }),
  handler: (req, res) => {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: 'GDPR deletion rate limit exceeded',
        ip: req.ip,
      })
    );

    // Security audit log for rate limit violation
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'security',
      event: 'rate_limit_exceeded',
      limiter: 'gdpr_deletion',
      ip: req.ip,
      endpoint: req.path,
      userAgent: req.get('user-agent'),
    }));

    // Prometheus metrics
    rate_limit_hits_total.inc({ limiter_type: 'gdpr_deletion' });

    res.status(429).json({
      error: 'too_many_requests',
      error_description: 'Too many data deletion requests. Please wait 15 minutes before trying again.',
      retry_after: '15 minutes',
      gdpr_notice: 'Your right to erasure is protected, but rate limiting prevents abuse.',
    });
  },
});

/**
 * Rate Limiter for GDPR Data Export Endpoint
 *
 * Limits: 10 requests per hour
 * Applies to: GET /api/gdpr/user-data
 * Purpose: Prevent abuse of GDPR Right to Portability (Article 20)
 *
 * GDPR Article 20 requires providing data in a "structured, commonly used,
 * and machine-readable format", but rate limiting is necessary to prevent:
 * - Resource exhaustion from session enumeration
 * - Database load from repeated queries
 * - Potential data scraping attacks
 */
export const gdprExportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 export requests per hour
  skipSuccessfulRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
  store: new IORedisStore({
    prefix: 'rl:gdpr:export:',
  }),
  handler: (req, res) => {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: 'GDPR export rate limit exceeded',
        ip: req.ip,
      })
    );

    // Security audit log for rate limit violation
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'security',
      event: 'rate_limit_exceeded',
      limiter: 'gdpr_export',
      ip: req.ip,
      endpoint: req.path,
      userAgent: req.get('user-agent'),
    }));

    // Prometheus metrics
    rate_limit_hits_total.inc({ limiter_type: 'gdpr_export' });

    res.status(429).json({
      error: 'too_many_requests',
      error_description: 'Too many data export requests. Please wait 1 hour before trying again.',
      retry_after: '1 hour',
      gdpr_notice: 'Your right to portability is protected, but rate limiting prevents abuse.',
    });
  },
});
