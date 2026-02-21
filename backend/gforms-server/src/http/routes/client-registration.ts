import { Router, Request, Response } from 'express';
import { clientRegistrationManager, ClientRegistrationRequest } from '../oauth/client-registration.js';

const router: Router = Router();

/**
 * Dynamic Client Registration Endpoint (RFC 7591)
 * POST /register
 *
 * Allows OAuth clients like MCP Inspector to register themselves dynamically
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const request: ClientRegistrationRequest = req.body;

    // Validate request
    if (!request.redirect_uris || request.redirect_uris.length === 0) {
      return res.status(400).json({
        error: 'invalid_client_metadata',
        error_description: 'redirect_uris is required and must not be empty',
      });
    }

    // Register the client
    const client = await clientRegistrationManager.registerClient(request);

    // Prepare response per RFC 7591
    // Check X-Forwarded-Proto for correct protocol when behind load balancer
    const protocol = req.get('X-Forwarded-Proto') || req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;

    const response: any = {
      client_id: client.client_id,
      client_name: client.client_name,
      redirect_uris: client.redirect_uris,
      grant_types: client.grant_types,
      response_types: client.response_types,
      token_endpoint_auth_method: client.token_endpoint_auth_method,
      client_id_issued_at: Math.floor(client.created_at / 1000),
    };

    // Only include client_secret for confidential clients
    if (client.client_secret) {
      response.client_secret = client.client_secret;
      response.client_secret_expires_at = 0; // Never expires
    }

    // Add registration metadata
    response.registration_client_uri = `${baseUrl}/register/${client.client_id}`;

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Client registered successfully',
      client_id: client.client_id,
      client_name: client.client_name,
      redirect_uris: client.redirect_uris,
    }));

    res.status(201).json(response);
  } catch (error: any) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Client registration failed',
      error: error.message,
      stack: error.stack,
    }));

    res.status(500).json({
      error: 'server_error',
      error_description: 'Failed to register client',
    });
  }
});

/**
 * Get client registration information
 * GET /register/:client_id
 */
router.get('/register/:client_id', async (req: Request, res: Response) => {
  try {
    const client_id = req.params.client_id as string;

    const client = await clientRegistrationManager.getClient(client_id);

    if (!client) {
      return res.status(404).json({
        error: 'invalid_client_id',
        error_description: 'Client not found',
      });
    }

    // Return client information (without secret)
    res.json({
      client_id: client.client_id,
      client_name: client.client_name,
      redirect_uris: client.redirect_uris,
      grant_types: client.grant_types,
      response_types: client.response_types,
      token_endpoint_auth_method: client.token_endpoint_auth_method,
      client_id_issued_at: Math.floor(client.created_at / 1000),
    });
  } catch (error: any) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Failed to get client registration',
      error: error.message,
    }));

    res.status(500).json({
      error: 'server_error',
      error_description: 'Failed to retrieve client registration',
    });
  }
});

/**
 * Delete client registration
 * DELETE /register/:client_id
 */
router.delete('/register/:client_id', async (req: Request, res: Response) => {
  try {
    const client_id = req.params.client_id as string;

    const deleted = await clientRegistrationManager.deleteClient(client_id);

    if (!deleted) {
      return res.status(404).json({
        error: 'invalid_client_id',
        error_description: 'Client not found',
      });
    }

    res.status(204).send();
  } catch (error: any) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Failed to delete client registration',
      error: error.message,
    }));

    res.status(500).json({
      error: 'server_error',
      error_description: 'Failed to delete client registration',
    });
  }
});

export default router;
