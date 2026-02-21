/**
 * Zod Validation Middleware
 *
 * Express middleware for validating requests using Zod schemas.
 * Returns 400 Bad Request with detailed error messages on validation failure.
 *
 * Phase 5.1 - CRITICAL Security Item #1
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { maskSensitiveData } from '../../utils/pii-masker.js';

/**
 * Format Zod validation errors into user-friendly messages
 */
function formatZodError(error: ZodError): {
  error: string;
  details: Array<{ field: string; message: string }>;
} {
  return {
    error: 'Validation failed',
    details: error.errors.map((err) => ({
      field: err.path.join('.') || 'root',
      message: err.message,
    })),
  };
}

/**
 * Validate request body against a Zod schema
 */
export function validateBody<T extends z.ZodType>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate and parse the request body
      const validated = await schema.parseAsync(req.body);

      // Replace req.body with validated data (ensures type safety)
      req.body = validated;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formatted = formatZodError(error);

        // Log validation failure for security monitoring
        console.error(
          JSON.stringify(
            maskSensitiveData({
              timestamp: new Date().toISOString(),
              level: 'warn',
              message: 'Request body validation failed',
              path: req.path,
              method: req.method,
              errors: formatted.details,
              ip: req.ip,
            })
          )
        );

        res.status(400).json(formatted);
      } else {
        // Unexpected error during validation
        console.error(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'error',
            message: 'Unexpected validation error',
            path: req.path,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        );

        res.status(500).json({
          error: 'Internal server error',
          message: 'Validation processing failed',
        });
      }
    }
  };
}

/**
 * Validate URL parameters against a Zod schema
 */
export function validateParams<T extends z.ZodType>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate params (Express 5: req.params is read-only, just validate without replacing)
      await schema.parseAsync(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formatted = formatZodError(error);

        console.error(
          JSON.stringify(
            maskSensitiveData({
              timestamp: new Date().toISOString(),
              level: 'warn',
              message: 'URL parameters validation failed',
              path: req.path,
              method: req.method,
              errors: formatted.details,
              ip: req.ip,
            })
          )
        );

        res.status(400).json(formatted);
      } else {
        console.error(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'error',
            message: 'Unexpected validation error',
            path: req.path,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        );

        res.status(500).json({
          error: 'Internal server error',
          message: 'Validation processing failed',
        });
      }
    }
  };
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQuery<T extends z.ZodType>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate query parameters (Express 5: req.query is read-only, just validate without replacing)
      await schema.parseAsync(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formatted = formatZodError(error);

        console.error(
          JSON.stringify(
            maskSensitiveData({
              timestamp: new Date().toISOString(),
              level: 'warn',
              message: 'Query parameters validation failed',
              path: req.path,
              method: req.method,
              errors: formatted.details,
              ip: req.ip,
            })
          )
        );

        res.status(400).json(formatted);
      } else {
        console.error(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'error',
            message: 'Unexpected validation error',
            path: req.path,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        );

        res.status(500).json({
          error: 'Internal server error',
          message: 'Validation processing failed',
        });
      }
    }
  };
}

/**
 * Validate multiple parts of the request at once
 */
export function validate(options: {
  body?: z.ZodType;
  params?: z.ZodType;
  query?: z.ZodType;
}) {
  const middlewares: Array<ReturnType<typeof validateBody | typeof validateParams | typeof validateQuery>> = [];

  if (options.body) {
    middlewares.push(validateBody(options.body));
  }
  if (options.params) {
    middlewares.push(validateParams(options.params));
  }
  if (options.query) {
    middlewares.push(validateQuery(options.query));
  }

  // Return a middleware that runs all validations in sequence
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    let index = 0;

    const runNext = (): void => {
      if (index >= middlewares.length) {
        next();
        return;
      }

      const middleware = middlewares[index++];
      middleware(req, res, runNext);
    };

    runNext();
  };
}

/**
 * Security middleware to check for common attack patterns
 */
export function securityCheck(req: Request, res: Response, next: NextFunction): void {
  // Check for SQL injection patterns in request body
  const bodyStr = JSON.stringify(req.body);
  const sqlPatterns = [
    /(\bUNION\b.*\bSELECT\b)/i,
    /(\bDROP\b.*\bTABLE\b)/i,
    /(\bINSERT\b.*\bINTO\b)/i,
    /(\bDELETE\b.*\bFROM\b)/i,
  ];

  for (const pattern of sqlPatterns) {
    if (pattern.test(bodyStr)) {
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: 'Potential SQL injection attempt detected',
          path: req.path,
          method: req.method,
          ip: req.ip,
          pattern: pattern.source,
        })
      );

      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid request content detected',
      });
      return;
    }
  }

  // Check for XSS patterns
  const xssPatterns = [/<script/i, /javascript:/i, /on\w+\s*=/i];

  for (const pattern of xssPatterns) {
    if (pattern.test(bodyStr)) {
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: 'Potential XSS attempt detected',
          path: req.path,
          method: req.method,
          ip: req.ip,
          pattern: pattern.source,
        })
      );

      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid request content detected',
      });
      return;
    }
  }

  next();
}

/**
 * Export validation utilities
 */
export { formatZodError, ZodError };
