import { Router, Request, Response } from 'express';

const router: Router = Router();

/**
 * OAuth 2.1 Resource Server Metadata (RFC 8414)
 * For MCP Streamable HTTP transport with bearer token authentication
 */
router.get('/.well-known/oauth-protected-resource', (req: Request, res: Response) => {
  // Check X-Forwarded-Proto for correct protocol when behind load balancer
  const protocol = req.get('X-Forwarded-Proto') || req.protocol;
  const host = req.get('host');
  const baseUrl = `${protocol}://${host}`;

  res.json({
    resource: baseUrl,
    authorization_servers: [`${baseUrl}`],
    bearer_methods_supported: ['header'],
    resource_documentation: `${baseUrl}/`,
  });
});

/**
 * OAuth 2.1 Resource Server Metadata for MCP endpoint
 */
router.get('/.well-known/oauth-protected-resource/mcp', (req: Request, res: Response) => {
  // Check X-Forwarded-Proto for correct protocol when behind load balancer
  const protocol = req.get('X-Forwarded-Proto') || req.protocol;
  const host = req.get('host');
  const baseUrl = `${protocol}://${host}`;

  res.json({
    resource: `${baseUrl}/mcp`,
    authorization_servers: [`${baseUrl}`],
    bearer_methods_supported: ['header'],
    resource_documentation: `${baseUrl}/`,
  });
});

/**
 * OAuth 2.1 Authorization Server Metadata (RFC 8414)
 */
router.get('/.well-known/oauth-authorization-server', (req: Request, res: Response) => {
  // Check X-Forwarded-Proto for correct protocol when behind load balancer
  const protocol = req.get('X-Forwarded-Proto') || req.protocol;
  const host = req.get('host');
  const baseUrl = `${protocol}://${host}`;

  res.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/auth/login`,
    token_endpoint: `${baseUrl}/api/generate-token`,
    registration_endpoint: `${baseUrl}/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    token_endpoint_auth_methods_supported: ['none'],
    code_challenge_methods_supported: ['S256'],
  });
});

/**
 * OpenID Connect Discovery (for compatibility)
 */
router.get('/.well-known/openid-configuration', (req: Request, res: Response) => {
  // Check X-Forwarded-Proto for correct protocol when behind load balancer
  const protocol = req.get('X-Forwarded-Proto') || req.protocol;
  const host = req.get('host');
  const baseUrl = `${protocol}://${host}`;

  res.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/auth/login`,
    token_endpoint: `${baseUrl}/api/generate-token`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    token_endpoint_auth_methods_supported: ['none'],
    code_challenge_methods_supported: ['S256'],
  });
});

export default router;
