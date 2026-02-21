/**
 * Zod Validation Schemas for Gmail MCP Server
 *
 * Comprehensive input validation to prevent:
 * - SQL injection
 * - XSS attacks
 * - Type confusion
 * - Malformed requests
 * - Buffer overflow attempts
 *
 * Phase 5.1 - CRITICAL Security Item #1
 */

import { z } from 'zod';

/**
 * Common Schemas
 */

// UUID v4 format
export const uuidSchema = z.string().uuid('Invalid UUID format');

// Email address
export const emailSchema = z.string().email('Invalid email address').max(320, 'Email too long');

// URL validation
export const urlSchema = z.string().url('Invalid URL format').max(2048, 'URL too long');

// Non-empty trimmed string
export const nonEmptyStringSchema = z.string().trim().min(1, 'Cannot be empty');

// Safe string (alphanumeric, dash, underscore only)
export const safeStringSchema = z.string().regex(/^[a-zA-Z0-9_-]+$/, 'Only alphanumeric, dash, and underscore allowed');

/**
 * OAuth 2.1 Schemas
 */

// OAuth 2.1 Authorization Code Exchange (RFC 6749)
export const oauth21TokenRequestSchema = z.object({
  grant_type: z.literal('authorization_code'),
  code: z.string().min(1, 'Authorization code required').max(512, 'Code too long'),
  redirect_uri: urlSchema,
  code_verifier: z.string().min(43, 'Code verifier too short').max(128, 'Code verifier too long')
    .regex(/^[A-Za-z0-9_-]+$/, 'Invalid code verifier format'),
  client_id: z.string().min(1, 'Client ID required').max(256, 'Client ID too long'),
});

// OAuth callback parameters
export const oauthCallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code required').max(512, 'Code too long'),
  state: z.string().min(1, 'State parameter required').max(256, 'State too long'),
  scope: z.string().optional(),
  authuser: z.string().optional(),
  prompt: z.string().optional(),
});

/**
 * Token Management Schemas
 */

// Bearer token format (UUID)
export const bearerTokenSchema = uuidSchema;

// Token generation request (legacy cookie-based)
export const legacyTokenGenerationSchema = z.object({
  name: z.string().max(100, 'Token name too long').optional(),
  description: z.string().max(500, 'Description too long').optional(),
});

// Token parameter in URL path
export const tokenParamSchema = z.object({
  token: bearerTokenSchema,
});

/**
 * JSON-RPC 2.0 Schemas
 */

// JSON-RPC ID (can be string, number, or null)
export const jsonRpcIdSchema = z.union([
  z.string().max(256, 'ID too long'),
  z.number(),
  z.null(),
]);

// JSON-RPC method name
export const jsonRpcMethodSchema = z.string()
  .min(1, 'Method required')
  .max(256, 'Method name too long')
  .regex(/^[a-zA-Z0-9_/]+$/, 'Invalid method name format');

// Base JSON-RPC 2.0 request
export const jsonRpcRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: jsonRpcIdSchema.optional(),
  method: jsonRpcMethodSchema,
  params: z.any().optional(), // Method-specific validation happens in handlers
});

/**
 * MCP Protocol Schemas
 */

// MCP initialize method
export const mcpInitializeParamsSchema = z.object({
  protocolVersion: z.string().max(20, 'Protocol version too long'),
  capabilities: z.object({
    roots: z.object({
      listChanged: z.boolean().optional(),
    }).optional(),
  }).optional(),
  clientInfo: z.object({
    name: z.string().max(256, 'Client name too long'),
    version: z.string().max(50, 'Client version too long'),
  }),
});

// MCP tools/call method parameters
export const mcpToolCallParamsSchema = z.object({
  name: z.string().min(1, 'Tool name required').max(256, 'Tool name too long'),
  arguments: z.record(z.any()).optional(), // Tool-specific validation
});

// MCP resources/read method parameters
export const mcpResourceReadParamsSchema = z.object({
  uri: z.string().min(1, 'URI required').max(2048, 'URI too long'),
});

// MCP prompts/get method parameters
export const mcpPromptGetParamsSchema = z.object({
  name: z.string().min(1, 'Prompt name required').max(256, 'Prompt name too long'),
  arguments: z.record(z.any()).optional(),
});

/**
 * Gmail Tool Schemas
 */

// Email address list (to, cc, bcc)
export const emailListSchema = z.array(emailSchema).max(100, 'Too many recipients');

// Gmail send_email tool
export const sendEmailParamsSchema = z.object({
  to: z.union([emailSchema, emailListSchema]),
  subject: z.string().min(1, 'Subject required').max(998, 'Subject too long'), // RFC 2822 limit
  body: z.string().max(500000, 'Email body too large (max 500KB)'), // Reasonable limit
  cc: z.union([emailSchema, emailListSchema]).optional(),
  bcc: z.union([emailSchema, emailListSchema]).optional(),
});

// Gmail search_emails tool
export const searchEmailsParamsSchema = z.object({
  query: z.string().min(1, 'Query required').max(1000, 'Query too long'),
  maxResults: z.number().int().min(1).max(100).default(10),
});

// Gmail read_email tool
export const readEmailParamsSchema = z.object({
  id: z.string().min(1, 'Email ID required').max(256, 'Email ID too long'),
});

// Gmail create_label tool
export const createLabelParamsSchema = z.object({
  name: z.string().min(1, 'Label name required').max(225, 'Label name too long'), // Gmail limit
});

// Gmail label operations (add/remove)
export const labelOperationParamsSchema = z.object({
  messageId: z.string().min(1, 'Message ID required').max(256, 'Message ID too long'),
  labelId: z.string().min(1, 'Label ID required').max(256, 'Label ID too long'),
});

// Gmail message operations (mark read/unread, trash, archive)
export const messageOperationParamsSchema = z.object({
  messageId: z.string().min(1, 'Message ID required').max(256, 'Message ID too long'),
});

/**
 * SSE and Streamable HTTP Schemas
 */

// Connection ID for SSE
export const sseConnectionIdSchema = z.object({
  connectionId: uuidSchema,
});

/**
 * Combined Token Request Schema (handles both OAuth 2.1 and legacy)
 *
 * This schema accepts two types of requests:
 * 1. OAuth 2.1 Authorization Code Exchange: Must have grant_type === 'authorization_code'
 *    with all required OAuth fields (code, redirect_uri, code_verifier, client_id)
 * 2. Legacy Cookie-Based: Can have optional name/description fields, NO OAuth fields
 *
 * The union allows either schema to match. The handler in token.ts will check grant_type
 * to determine which flow to use.
 */
export const tokenRequestSchema = z.union([
  oauth21TokenRequestSchema,
  legacyTokenGenerationSchema,
]).refine(
  (data) => {
    // If any OAuth field is present, it MUST be a complete OAuth request
    const hasOAuthFields = 'code' in data || 'grant_type' in data || 'redirect_uri' in data || 'code_verifier' in data || 'client_id' in data;

    if (hasOAuthFields) {
      // Must have ALL required OAuth fields
      return 'grant_type' in data &&
             data.grant_type === 'authorization_code' &&
             'code' in data &&
             'redirect_uri' in data &&
             'code_verifier' in data &&
             'client_id' in data;
    }

    // Otherwise, it's legacy flow (no OAuth fields at all)
    return true;
  },
  {
    message: 'Invalid request. For OAuth 2.1, must include: grant_type="authorization_code", code, redirect_uri, code_verifier, client_id',
  }
);

/**
 * Validation Helper Functions
 */

// Sanitize string for logging (remove potential injection characters)
export function sanitizeForLog(input: string, maxLength = 100): string {
  return input
    .replace(/[<>'"&]/g, '') // Remove HTML/SQL injection characters
    .substring(0, maxLength);
}

// Check if string contains potential SQL injection patterns
export function hasSqlInjectionPattern(input: string): boolean {
  const sqlPatterns = [
    /(\bUNION\b.*\bSELECT\b)/i,
    /(\bDROP\b.*\bTABLE\b)/i,
    /(\bINSERT\b.*\bINTO\b)/i,
    /(\bDELETE\b.*\bFROM\b)/i,
    /(\bUPDATE\b.*\bSET\b)/i,
    /(--)/,
    /(\/\*.*\*\/)/,
    /(\bOR\b.*=.*)/i,
    /(\bAND\b.*=.*)/i,
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

// Check if string contains potential XSS patterns
export function hasXssPattern(input: string): boolean {
  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick, onerror, etc.
    /<iframe/i,
    /<object/i,
    /<embed/i,
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Export all schemas for use in middleware
 */
export const schemas = {
  // OAuth
  oauth21TokenRequest: oauth21TokenRequestSchema,
  oauthCallback: oauthCallbackSchema,

  // Tokens
  bearerToken: bearerTokenSchema,
  legacyTokenGeneration: legacyTokenGenerationSchema,
  tokenParam: tokenParamSchema,
  tokenRequest: tokenRequestSchema,

  // JSON-RPC
  jsonRpcRequest: jsonRpcRequestSchema,

  // MCP
  mcpInitializeParams: mcpInitializeParamsSchema,
  mcpToolCallParams: mcpToolCallParamsSchema,
  mcpResourceReadParams: mcpResourceReadParamsSchema,
  mcpPromptGetParams: mcpPromptGetParamsSchema,

  // Gmail Tools
  sendEmailParams: sendEmailParamsSchema,
  searchEmailsParams: searchEmailsParamsSchema,
  readEmailParams: readEmailParamsSchema,
  createLabelParams: createLabelParamsSchema,
  labelOperationParams: labelOperationParamsSchema,
  messageOperationParams: messageOperationParamsSchema,

  // SSE
  sseConnectionId: sseConnectionIdSchema,
};
