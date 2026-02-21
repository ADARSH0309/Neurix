/**
 * Prometheus Metrics for Gmail MCP Server
 *
 * Provides observability metrics for monitoring and alerting
 */

import promClient from 'prom-client';

// Create metrics registry
const register = new promClient.Registry();

// Collect default metrics (CPU, memory, event loop)
promClient.collectDefaultMetrics({
  register,
  prefix: 'gmail_mcp_',
});

// ============================================================================
// Tool Metrics
// ============================================================================

/**
 * Counter: Total number of tool calls
 */
export const toolCallCounter = new promClient.Counter({
  name: 'gmail_mcp_tool_calls_total',
  help: 'Total number of MCP tool calls',
  labelNames: ['tool_name', 'status'] as const,
  registers: [register],
});

/**
 * Histogram: Duration of tool calls
 */
export const toolCallDuration = new promClient.Histogram({
  name: 'gmail_mcp_tool_call_duration_seconds',
  help: 'Duration of MCP tool calls in seconds',
  labelNames: ['tool_name'] as const,
  buckets: [0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

/**
 * Gauge: Currently executing tools
 */
export const activeToolCalls = new promClient.Gauge({
  name: 'gmail_mcp_active_tool_calls',
  help: 'Number of currently executing tool calls',
  labelNames: ['tool_name'] as const,
  registers: [register],
});

// ============================================================================
// Session Metrics
// ============================================================================

/**
 * Gauge: Active sessions
 */
export const activeSessions = new promClient.Gauge({
  name: 'gmail_mcp_active_sessions',
  help: 'Number of active user sessions',
  registers: [register],
});

/**
 * Counter: Session events
 */
export const sessionEvents = new promClient.Counter({
  name: 'gmail_mcp_session_events_total',
  help: 'Total session events',
  labelNames: ['event'] as const, // created, expired, refreshed, destroyed
  registers: [register],
});

// ============================================================================
// OAuth Metrics
// ============================================================================

/**
 * Counter: OAuth events
 */
export const oauthEvents = new promClient.Counter({
  name: 'gmail_mcp_oauth_events_total',
  help: 'Total OAuth events',
  labelNames: ['event', 'status'] as const, // authorize, callback, refresh
  registers: [register],
});

// ============================================================================
// Gmail API Metrics
// ============================================================================

/**
 * Counter: Gmail API calls
 */
export const gmailApiCalls = new promClient.Counter({
  name: 'gmail_mcp_gmail_api_calls_total',
  help: 'Total Gmail API calls',
  labelNames: ['operation', 'status'] as const,
  registers: [register],
});

/**
 * Histogram: Gmail API latency
 */
export const gmailApiLatency = new promClient.Histogram({
  name: 'gmail_mcp_gmail_api_latency_seconds',
  help: 'Gmail API call latency in seconds',
  labelNames: ['operation'] as const,
  buckets: [0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
  registers: [register],
});

// ============================================================================
// Circuit Breaker Metrics
// ============================================================================

/**
 * Gauge: Circuit breaker state
 */
export const circuitBreakerState = new promClient.Gauge({
  name: 'gmail_mcp_circuit_breaker_state',
  help: 'Circuit breaker state (0=closed, 1=half-open, 2=open)',
  labelNames: ['operation'] as const,
  registers: [register],
});

/**
 * Counter: Circuit breaker events
 */
export const circuitBreakerEvents = new promClient.Counter({
  name: 'gmail_mcp_circuit_breaker_events_total',
  help: 'Circuit breaker state change events',
  labelNames: ['operation', 'event'] as const, // open, close, half_open, reject
  registers: [register],
});

// ============================================================================
// Rate Limiting Metrics
// ============================================================================

/**
 * Counter: Rate limit events
 */
export const rateLimitEvents = new promClient.Counter({
  name: 'gmail_mcp_rate_limit_events_total',
  help: 'Rate limiting events',
  labelNames: ['type', 'result'] as const, // global/user/tool, allowed/blocked
  registers: [register],
});

// ============================================================================
// Error Metrics
// ============================================================================

/**
 * Counter: Errors by type
 */
export const errorCounter = new promClient.Counter({
  name: 'gmail_mcp_errors_total',
  help: 'Total errors by type',
  labelNames: ['error_type', 'error_code'] as const,
  registers: [register],
});

// ============================================================================
// HTTP Metrics (for HTTP transport)
// ============================================================================

/**
 * Counter: HTTP requests
 */
export const httpRequestsTotal = new promClient.Counter({
  name: 'gmail_mcp_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status'] as const,
  registers: [register],
});

/**
 * Histogram: HTTP request duration
 */
export const httpRequestDuration = new promClient.Histogram({
  name: 'gmail_mcp_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path'] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Record tool call metrics
 */
export function recordToolCall(
  toolName: string,
  status: 'success' | 'error',
  durationMs: number
): void {
  toolCallCounter.inc({ tool_name: toolName, status });
  toolCallDuration.observe({ tool_name: toolName }, durationMs / 1000);
}

/**
 * Record Gmail API call metrics
 */
export function recordGmailApiCall(
  operation: string,
  status: 'success' | 'error',
  durationMs: number
): void {
  gmailApiCalls.inc({ operation, status });
  gmailApiLatency.observe({ operation }, durationMs / 1000);
}

/**
 * Record error metrics
 */
export function recordError(errorType: string, errorCode: string): void {
  errorCounter.inc({ error_type: errorType, error_code: errorCode });
}

/**
 * Get metrics for /metrics endpoint
 */
export async function getMetrics(): Promise<string> {
  return register.metrics();
}

/**
 * Get content type for metrics response
 */
export function getMetricsContentType(): string {
  return register.contentType;
}

// Export registry for custom metrics
export { register };
