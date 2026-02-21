/**
 * Zod Validation Schemas for Google Calendar MCP Server
 */

import { z } from 'zod';

/**
 * Common Schemas
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');
export const emailSchema = z.string().email('Invalid email address').max(320, 'Email too long');
export const urlSchema = z.string().url('Invalid URL format').max(2048, 'URL too long');
export const nonEmptyStringSchema = z.string().trim().min(1, 'Cannot be empty');
export const safeStringSchema = z.string().regex(/^[a-zA-Z0-9_-]+$/, 'Only alphanumeric, dash, and underscore allowed');

/**
 * OAuth 2.1 Schemas
 */
export const oauth21TokenRequestSchema = z.object({
  grant_type: z.literal('authorization_code'),
  code: z.string().min(1, 'Authorization code required').max(512, 'Code too long'),
  redirect_uri: urlSchema,
  code_verifier: z.string().min(43, 'Code verifier too short').max(128, 'Code verifier too long')
    .regex(/^[A-Za-z0-9_-]+$/, 'Invalid code verifier format'),
  client_id: z.string().min(1, 'Client ID required').max(256, 'Client ID too long'),
});

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
export const bearerTokenSchema = uuidSchema;

export const legacyTokenGenerationSchema = z.object({
  name: z.string().max(100, 'Token name too long').optional(),
  description: z.string().max(500, 'Description too long').optional(),
});

export const tokenParamSchema = z.object({
  token: bearerTokenSchema,
});

/**
 * JSON-RPC 2.0 Schemas
 */
export const jsonRpcIdSchema = z.union([
  z.string().max(256, 'ID too long'),
  z.number(),
  z.null(),
]);

export const jsonRpcMethodSchema = z.string()
  .min(1, 'Method required')
  .max(256, 'Method name too long')
  .regex(/^[a-zA-Z0-9_/]+$/, 'Invalid method name format');

export const jsonRpcRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: jsonRpcIdSchema.optional(),
  method: jsonRpcMethodSchema,
  params: z.any().optional(),
});

/**
 * MCP Protocol Schemas
 */
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

export const mcpToolCallParamsSchema = z.object({
  name: z.string().min(1, 'Tool name required').max(256, 'Tool name too long'),
  arguments: z.record(z.any()).optional(),
});

export const mcpResourceReadParamsSchema = z.object({
  uri: z.string().min(1, 'URI required').max(2048, 'URI too long'),
});

export const mcpPromptGetParamsSchema = z.object({
  name: z.string().min(1, 'Prompt name required').max(256, 'Prompt name too long'),
  arguments: z.record(z.any()).optional(),
});

/**
 * Google Calendar Tool Schemas
 */
export const calendarIdSchema = z.string().min(1, 'Calendar ID required').max(256, 'Calendar ID too long');

export const listEventsParamsSchema = z.object({
  calendarId: calendarIdSchema.optional().default('primary'),
  timeMin: z.string().max(100).optional(),
  timeMax: z.string().max(100).optional(),
  maxResults: z.number().int().min(1).max(250).default(25),
  q: z.string().max(1000).optional(),
  orderBy: z.string().max(100).optional(),
  singleEvents: z.boolean().optional().default(true),
  pageToken: z.string().max(256).optional(),
  timeZone: z.string().max(100).optional(),
  showDeleted: z.boolean().optional().default(false),
});

export const createEventParamsSchema = z.object({
  calendarId: calendarIdSchema.optional().default('primary'),
  summary: z.string().min(1, 'Summary required').max(1000, 'Summary too long'),
  description: z.string().max(5000, 'Description too long').optional(),
  location: z.string().max(500, 'Location too long').optional(),
  startDateTime: z.string().max(100).optional(),
  startDate: z.string().max(20).optional(),
  endDateTime: z.string().max(100).optional(),
  endDate: z.string().max(20).optional(),
  timeZone: z.string().max(100).optional(),
  attendees: z.array(z.string().email()).max(100).optional(),
  recurrence: z.array(z.string().max(256)).max(10).optional(),
  colorId: z.string().max(10).optional(),
  visibility: z.enum(['default', 'public', 'private', 'confidential']).optional(),
  conferenceData: z.boolean().optional(),
  sendUpdates: z.enum(['all', 'externalOnly', 'none']).optional(),
});

/**
 * SSE and Streamable HTTP Schemas
 */
export const sseConnectionIdSchema = z.object({
  connectionId: uuidSchema,
});

/**
 * Combined Token Request Schema
 */
export const tokenRequestSchema = z.union([
  oauth21TokenRequestSchema,
  legacyTokenGenerationSchema,
]).refine(
  (data) => {
    const hasOAuthFields = 'code' in data || 'grant_type' in data || 'redirect_uri' in data || 'code_verifier' in data || 'client_id' in data;

    if (hasOAuthFields) {
      return 'grant_type' in data &&
             data.grant_type === 'authorization_code' &&
             'code' in data &&
             'redirect_uri' in data &&
             'code_verifier' in data &&
             'client_id' in data;
    }

    return true;
  },
  {
    message: 'Invalid request. For OAuth 2.1, must include: grant_type="authorization_code", code, redirect_uri, code_verifier, client_id',
  }
);

/**
 * Export all schemas
 */
export const schemas = {
  oauth21TokenRequest: oauth21TokenRequestSchema,
  oauthCallback: oauthCallbackSchema,
  bearerToken: bearerTokenSchema,
  legacyTokenGeneration: legacyTokenGenerationSchema,
  tokenParam: tokenParamSchema,
  tokenRequest: tokenRequestSchema,
  jsonRpcRequest: jsonRpcRequestSchema,
  mcpInitializeParams: mcpInitializeParamsSchema,
  mcpToolCallParams: mcpToolCallParamsSchema,
  mcpResourceReadParams: mcpResourceReadParamsSchema,
  mcpPromptGetParams: mcpPromptGetParamsSchema,
  listEventsParams: listEventsParamsSchema,
  createEventParams: createEventParamsSchema,
  sseConnectionId: sseConnectionIdSchema,
};
