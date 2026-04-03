/**
 * OAuth 2.0 Dynamic Client Registration (RFC 7591)
 *
 * Allows MCP Inspector and other OAuth clients to dynamically register
 * themselves without pre-configured client credentials.
 */

import { Router, Request, Response } from 'express';
import { clientRegistrationManager, type ClientRegistrationRequest } from '../oauth/client-registration.js';
import { authJsonParser, oauthRegisterCorsMiddleware } from '../middleware.js';

const router: Router = Router();

/**
 * Handle CORS preflight for OAuth client registration
 * OPTIONS /oauth/register
 */
router.options('/oauth/register', oauthRegisterCorsMiddleware, (req: Request, res: Response) => {
  // CORS middleware handles the response
  res.status(204).send();
});

/**
 * Register a new OAuth client
 * POST /oauth/register
 *
 * Request body (RFC 7591):
 * {
 *   "client_name": "My MCP Client",
 *   "redirect_uris": ["http://localhost:6277/oauth/callback"],
 *   "grant_types": ["authorization_code"],
 *   "response_types": ["code"],
 *   "token_endpoint_auth_method": "none"
 * }
 *
 * Response:
 * {
 *   "client_id": "mcp_abc123...",
 *   "client_name": "My MCP Client",
 *   "redirect_uris": ["http://localhost:6277/oauth/callback"],
 *   "grant_types": ["authorization_code"],
 *   "response_types": ["code"],
 *   "token_endpoint_auth_method": "none",
 *   "created_at": 1234567890
 * }
 */
router.post('/oauth/register', oauthRegisterCorsMiddleware, authJsonParser, async (req: Request, res: Response) => {
  try {
    const requestBody = req.body as ClientRegistrationRequest;

    // Validate request - check if body is empty or missing required fields
    if (!requestBody || Object.keys(requestBody).length === 0) {
      res.status(400).json({
        error: 'invalid_request',
        error_description: 'Request body is required',
      });
      return;
    }

    // Register the client
    const client = await clientRegistrationManager.registerClient(requestBody);

    // Return client registration response (RFC 7591)
    res.status(201).json({
      client_id: client.client_id,
      client_secret: client.client_secret, // undefined for public clients
      client_name: client.client_name,
      redirect_uris: client.redirect_uris,
      grant_types: client.grant_types,
      response_types: client.response_types,
      token_endpoint_auth_method: client.token_endpoint_auth_method,
      created_at: Math.floor(client.created_at / 1000), // Unix timestamp in seconds
    });

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'OAuth client registered via DCR',
        client_id: client.client_id,
        client_name: client.client_name,
        redirect_uris: client.redirect_uris,
      })
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'OAuth client registration failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    );

    res.status(500).json({
      error: 'server_error',
      error_description: 'Failed to register client',
    });
  }
});

export default router;
