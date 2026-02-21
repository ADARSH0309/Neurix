/**
 * Custom Error Classes for Gmail MCP Server
 *
 * Hierarchical error system for proper categorization and handling
 */

/**
 * Base MCP Error class
 */
export class McpError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toMcpResponse(): {
    content: Array<{ type: string; text: string }>;
    isError: boolean;
  } {
    return {
      content: [{
        type: 'text',
        text: `Error (${this.code}): ${this.message}`,
      }],
      isError: true,
    };
  }
}

/**
 * Validation Error (400)
 * Thrown when input validation fails
 */
export class ValidationError extends McpError {
  constructor(message: string, public details?: Record<string, unknown>) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

/**
 * Authentication Error (401)
 * Thrown when authentication fails or token is invalid
 */
export class AuthenticationError extends McpError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/**
 * Permission Error (403)
 * Thrown when user lacks required permissions
 */
export class PermissionError extends McpError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'PERMISSION_ERROR');
  }
}

/**
 * Not Found Error (404)
 * Thrown when requested resource doesn't exist
 */
export class NotFoundError extends McpError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} not found: ${id}` : `${resource} not found`;
    super(message, 404, 'NOT_FOUND_ERROR');
  }
}

/**
 * Rate Limit Error (429)
 * Thrown when rate limit is exceeded
 */
export class RateLimitError extends McpError {
  constructor(
    message: string = 'Rate limit exceeded',
    public retryAfter: number = 60
  ) {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }

  override toMcpResponse() {
    return {
      content: [{
        type: 'text',
        text: `Rate limit exceeded. Please try again in ${this.retryAfter} seconds.`,
      }],
      isError: true,
    };
  }
}

/**
 * Service Unavailable Error (503)
 * Thrown when external service is unavailable
 */
export class ServiceUnavailableError extends McpError {
  constructor(service: string = 'External service') {
    super(`${service} is temporarily unavailable`, 503, 'SERVICE_UNAVAILABLE');
  }
}

/**
 * Gmail API Error
 * Wraps Gmail-specific API errors
 */
export class GmailApiError extends McpError {
  constructor(
    message: string,
    public gmailErrorCode?: number,
    public gmailErrorReason?: string
  ) {
    const statusCode = gmailErrorCode || 500;
    super(message, statusCode, 'GMAIL_API_ERROR');
  }
}

/**
 * Session Error
 * Thrown for session-related issues
 */
export class SessionError extends McpError {
  constructor(message: string = 'Session error') {
    super(message, 401, 'SESSION_ERROR');
  }
}

/**
 * Token Expired Error
 * Thrown when OAuth token has expired
 */
export class TokenExpiredError extends AuthenticationError {
  constructor() {
    super('OAuth token has expired. Please re-authenticate.');
    this.code = 'TOKEN_EXPIRED';
  }
}

/**
 * Circuit Breaker Open Error
 * Thrown when circuit breaker is in open state
 */
export class CircuitBreakerOpenError extends ServiceUnavailableError {
  constructor(operation: string) {
    super(`Circuit breaker open for ${operation}`);
    this.code = 'CIRCUIT_BREAKER_OPEN';
  }
}

/**
 * Format any error into MCP response format
 */
export function formatMcpError(error: unknown): {
  content: Array<{ type: string; text: string }>;
  isError: boolean;
} {
  if (error instanceof McpError) {
    return error.toMcpResponse();
  }

  if (error instanceof Error) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error.message}`,
      }],
      isError: true,
    };
  }

  return {
    content: [{
      type: 'text',
      text: 'An unknown error occurred',
    }],
    isError: true,
  };
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof RateLimitError) return true;
  if (error instanceof ServiceUnavailableError) return true;
  if (error instanceof GmailApiError) {
    // Gmail transient errors
    return [429, 500, 502, 503, 504].includes(error.gmailErrorCode || 0);
  }
  return false;
}
