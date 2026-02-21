import { Router, Request, Response } from 'express';
import { sseConnectionManager } from './connection-manager.js';
import type { AuthenticatedRequest } from '../auth/middleware.js';
import { requireAuth } from '../auth/middleware.js';

const router: Router = Router();

/**
 * SSE endpoint for MCP HTTP+SSE transport
 *
 * According to MCP specification:
 * 1. Client connects with GET request
 * 2. Server responds with SSE headers
 * 3. Server sends "endpoint" event with POST URL
 * 4. Connection stays open for streaming responses
 */
router.get('/sse', requireAuth, (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;

  // Get user email from session
  const userEmail = authReq.session?.userEmail;
  if (!userEmail) {
    res.status(401).json({
      error: 'User email not found in session. Please re-authenticate.',
    });
    return;
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // CORS headers for SSE
  if (req.headers.origin) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  // Flush headers immediately
  res.flushHeaders();

  // Create SSE connection
  const connectionId = sseConnectionManager.createConnection(userEmail, res);

  // Send initial "endpoint" event per MCP spec
  // The endpoint URL is where the client should POST requests
  const protocol = req.protocol;
  const host = req.get('host');
  const endpointUrl = `${protocol}://${host}/mcp/${connectionId}`;

  sseConnectionManager.sendEndpoint(connectionId, endpointUrl);

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'SSE connection established',
    connectionId,
    userEmail,
  }));

  // Handle client disconnect
  req.on('close', () => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'SSE connection closed',
      connectionId,
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
});

/**
 * Get SSE connection stats (for debugging/monitoring)
 */
router.get('/sse/stats', requireAuth, (req: Request, res: Response) => {
  const stats = sseConnectionManager.getStats();
  res.json(stats);
});

export default router;
