/**
 * Zod Validation Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { maskSensitiveData } from '../../utils/pii-masker.js';

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

export function validateBody<T extends z.ZodType>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = await schema.parseAsync(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formatted = formatZodError(error);

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

export function validateParams<T extends z.ZodType>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
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

export function validateQuery<T extends z.ZodType>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
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

export function securityCheck(req: Request, res: Response, next: NextFunction): void {
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

export { formatZodError, ZodError };
