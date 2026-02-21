/**
 * Zod Validation Schemas for Google Drive MCP Server
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
 * Google Drive Tool Schemas
 */
export const fileIdSchema = z.string().min(1, 'File ID required').max(256, 'File ID too long');

export const listFilesParamsSchema = z.object({
  folderId: fileIdSchema.optional(),
  pageSize: z.number().int().min(1).max(100).default(10),
  orderBy: z.string().max(100).optional(),
  pageToken: z.string().max(256).optional(),
});

export const searchFilesParamsSchema = z.object({
  query: z.string().min(1, 'Query required').max(1000, 'Query too long'),
  maxResults: z.number().int().min(1).max(100).default(10),
});

export const createFolderParamsSchema = z.object({
  name: z.string().min(1, 'Folder name required').max(255, 'Folder name too long'),
  parentId: fileIdSchema.optional(),
  description: z.string().max(1000, 'Description too long').optional(),
});

export const uploadFileParamsSchema = z.object({
  name: z.string().min(1, 'File name required').max(255, 'File name too long'),
  content: z.string().max(5000000, 'Content too large (max 5MB)'),
  mimeType: z.string().max(100, 'MIME type too long').optional(),
  folderId: fileIdSchema.optional(),
  description: z.string().max(1000, 'Description too long').optional(),
});

export const shareFileParamsSchema = z.object({
  fileId: fileIdSchema,
  email: emailSchema.optional(),
  role: z.enum(['reader', 'writer', 'commenter', 'owner']),
  type: z.enum(['user', 'group', 'domain', 'anyone']),
  domain: z.string().max(100).optional(),
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
  listFilesParams: listFilesParamsSchema,
  searchFilesParams: searchFilesParamsSchema,
  createFolderParams: createFolderParamsSchema,
  uploadFileParams: uploadFileParamsSchema,
  shareFileParams: shareFileParamsSchema,
  sseConnectionId: sseConnectionIdSchema,
};
