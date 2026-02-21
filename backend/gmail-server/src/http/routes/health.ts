/**
 * Health Check Route
 */

import type { Request, Response } from 'express';

export function createHealthCheckHandler(isAuthenticated: () => boolean) {
  return (_req: Request, res: Response): void => {
    res.json({
      status: 'healthy',
      service: 'gmail-mcp-server',
      version: '0.1.0',
      authenticated: isAuthenticated(),
    });
  };
}
