/**
 * Rate Limiting Middleware
 */

import rateLimit from 'express-rate-limit';
import { IORedisStore } from './redis-rate-limit-store.js';
import { rate_limit_hits_total } from '../metrics/prometheus.js';

/**
 * Rate Limiter for Authentication Endpoints
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  store: new IORedisStore({
    prefix: 'rl:gmail:auth:',
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

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'security',
      event: 'rate_limit_exceeded',
      limiter: 'auth',
      ip: req.ip,
      endpoint: req.path,
      userAgent: req.get('user-agent'),
    }));

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
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skipSuccessfulRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
  store: new IORedisStore({
    prefix: 'rl:gmail:api:',
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

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'security',
      event: 'rate_limit_exceeded',
      limiter: 'api',
      ip: req.ip,
      endpoint: req.path,
      userAgent: req.get('user-agent'),
    }));

    rate_limit_hits_total.inc({ limiter_type: 'api' });

    res.status(429).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Rate limit exceeded',
        data: {
          retryAfter: 900,
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
 */
export const tokenGenerationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
  store: new IORedisStore({
    prefix: 'rl:gmail:token:',
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

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'security',
      event: 'rate_limit_exceeded',
      limiter: 'token_generation',
      ip: req.ip,
      endpoint: req.path,
      userAgent: req.get('user-agent'),
    }));

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
 */
export const sseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
  store: new IORedisStore({
    prefix: 'rl:gmail:sse:',
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

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'security',
      event: 'rate_limit_exceeded',
      limiter: 'sse',
      ip: req.ip,
      endpoint: req.path,
      userAgent: req.get('user-agent'),
    }));

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
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  skipSuccessfulRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
  store: new IORedisStore({
    prefix: 'rl:gmail:general:',
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

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'security',
      event: 'rate_limit_exceeded',
      limiter: 'general',
      ip: req.ip,
      endpoint: req.path,
      userAgent: req.get('user-agent'),
    }));

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
 */
export const gdprDeletionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
  store: new IORedisStore({
    prefix: 'rl:gmail:gdpr:delete:',
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

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'security',
      event: 'rate_limit_exceeded',
      limiter: 'gdpr_deletion',
      ip: req.ip,
      endpoint: req.path,
      userAgent: req.get('user-agent'),
    }));

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
 */
export const gdprExportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
  store: new IORedisStore({
    prefix: 'rl:gmail:gdpr:export:',
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

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'security',
      event: 'rate_limit_exceeded',
      limiter: 'gdpr_export',
      ip: req.ip,
      endpoint: req.path,
      userAgent: req.get('user-agent'),
    }));

    rate_limit_hits_total.inc({ limiter_type: 'gdpr_export' });

    res.status(429).json({
      error: 'too_many_requests',
      error_description: 'Too many data export requests. Please wait 1 hour before trying again.',
      retry_after: '1 hour',
      gdpr_notice: 'Your right to portability is protected, but rate limiting prevents abuse.',
    });
  },
});
