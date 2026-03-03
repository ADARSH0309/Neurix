/**
 * SSE Routes for MCP Transport
 */

import { Router, type Request, type Response } from 'express';
import { sseConnectionManager } from './connection-manager.js';
import { requireAuth, type AuthenticatedRequest } from '../auth/middleware.js';
import { sseLimiter } from '../middleware/rate-limiters.js';

const router: Router = Router();

/**
 * GET /sse - Establish SSE connection
 */
router.get('/sse', sseLimiter, requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
  const userEmail = req.session?.userEmail;

  if (!userEmail) {
    res.status(401).json({
      error: 'Authentication required',
      message: 'User email not found in session',
    });
    return;
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // CORS headers
  if (req.headers.origin) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.flushHeaders();

  try {
    // Create connection
    const connectionId = sseConnectionManager.createConnection(userEmail, res);

    // Determine the base URL for the MCP endpoint
    const protocol = req.get('X-Forwarded-Proto') || req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;
    const mcpEndpoint = `${baseUrl}/mcp/${connectionId}`;

    // Send endpoint event per MCP SSE transport spec
    sseConnectionManager.sendEndpoint(connectionId, mcpEndpoint);

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'SSE connection established',
      connectionId,
      userEmail,
      mcpEndpoint,
    }));

    // Handle client disconnect
    req.on('close', () => {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'SSE client disconnected',
        connectionId,
        userEmail,
      }));
      sseConnectionManager.removeConnection(connectionId);
    });

    // Handle errors
    res.on('error', (error) => {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'SSE connection error',
        connectionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
      sseConnectionManager.removeConnection(connectionId);
    });
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Failed to establish SSE connection',
      userEmail,
      error: error instanceof Error ? error.message : 'Unknown error',
    }));

    res.status(500).json({
      error: 'Failed to establish connection',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /sse/stats - Get SSE connection statistics
 */
router.get('/sse/stats', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
  const stats = sseConnectionManager.getStats();

  res.json({
    success: true,
    stats: {
      totalConnections: stats.totalConnections,
      uniqueUsers: stats.uniqueUsers,
      connections: stats.connections.map(conn => ({
        id: conn.id,
        userEmail: conn.userEmail,
        connectedAt: conn.connectedAt,
        lastActivity: conn.lastActivity,
        duration: conn.duration,
      })),
    },
  });
});

export default router;
