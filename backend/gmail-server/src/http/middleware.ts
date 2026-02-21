/**
 * Gmail MCP Server - Middleware
 */

import express, { type Request, type Response, type NextFunction, type RequestHandler } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

/**
 * CORS middleware - permissive for Gmail server (frontend integration)
 */
export const corsMiddleware = cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
});

/**
 * Cookie parser middleware
 */
export const cookieMiddleware: RequestHandler = cookieParser();

/**
 * JSON body parser for MCP requests
 */
export const mcpJsonParser: RequestHandler = express.json({ limit: '1mb' });

/**
 * Default JSON parser
 */
export const defaultJsonParser: RequestHandler = express.json();

/**
 * Request logging middleware
 */
export function requestLogger(req: Request, _res: Response, next: NextFunction): void {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    method: req.method,
    path: req.path,
  }));
  next();
}

/**
 * Error handling middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'error',
    error: err.message,
    path: req.path,
    method: req.method,
  }));

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
  });
}
