/**
 * Prometheus Metrics Collection
 *
 * Phase 5.1 - Week 2, Task 2.4: Prometheus Metrics (Issue #9)
 *
 * Collects 5 key operational metrics:
 * 1. OAuth success/failure rate (oauth_requests_total)
 * 2. Token generation rate (token_generation_total)
 * 3. MCP request latency (mcp_request_duration_seconds)
 * 4. Redis connection pool usage (redis_connections_active)
 * 5. Rate limit trigger count (rate_limit_hits_total)
 *
 * These metrics are exposed via /metrics endpoint for Prometheus scraping.
 */

import { Registry, Counter, Histogram, Gauge } from 'prom-client';

/**
 * Prometheus Registry
 *
 * Stores all metrics for this application instance.
 * Scraped by Prometheus via /metrics endpoint.
 */
export const register = new Registry();

/**
 * OAuth Requests Total Counter
 *
 * Tracks OAuth flow success and failure rates.
 * Labels:
 * - status: "success" or "failure"
 * - flow_type: "pkce" (OAuth 2.1 PKCE flow) or "legacy" (cookie-based)
 *
 * Phase 5.1 - Week 2, Task 2.4: Prometheus Metrics (Issue #9)
 */
export const oauth_requests_total = new Counter({
  name: 'oauth_requests_total',
  help: 'Total number of OAuth requests by status and flow type',
  labelNames: ['status', 'flow_type'],
  registers: [register],
});

/**
 * Token Generation Total Counter
 *
 * Tracks bearer token generation success and failure rates.
 * Labels:
 * - status: "success" or "failure"
 *
 * Phase 5.1 - Week 2, Task 2.4: Prometheus Metrics (Issue #9)
 */
export const token_generation_total = new Counter({
  name: 'token_generation_total',
  help: 'Total number of bearer token generation attempts by status',
  labelNames: ['status'],
  registers: [register],
});

/**
 * MCP Request Duration Histogram
 *
 * Tracks MCP request latency distribution in seconds.
 * Labels:
 * - method: JSON-RPC method name (e.g., "tools/list", "tools/call")
 * - status: "success" or "error"
 *
 * Buckets: 0.05s, 0.1s, 0.25s, 0.5s, 1s, 2.5s, 5s, 10s
 *
 * Phase 5.1 - Week 2, Task 2.4: Prometheus Metrics (Issue #9)
 */
export const mcp_request_duration_seconds = new Histogram({
  name: 'mcp_request_duration_seconds',
  help: 'MCP request duration in seconds',
  labelNames: ['method', 'status'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

/**
 * Redis Connections Active Gauge
 *
 * Tracks active Redis connections.
 * Value: 1 (connected) or 0 (disconnected)
 *
 * Note: For connection pools, this can be extended to track pool size.
 *
 * Phase 5.1 - Week 2, Task 2.4: Prometheus Metrics (Issue #9)
 */
export const redis_connections_active = new Gauge({
  name: 'redis_connections_active',
  help: 'Number of active Redis connections (1=connected, 0=disconnected)',
  registers: [register],
});

/**
 * Rate Limit Hits Total Counter
 *
 * Tracks rate limit violations by limiter type.
 * Labels:
 * - limiter_type: "auth", "api", "token", "sse", or "general"
 *
 * Phase 5.1 - Week 2, Task 2.4: Prometheus Metrics (Issue #9)
 */
export const rate_limit_hits_total = new Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of rate limit hits by limiter type',
  labelNames: ['limiter_type'],
  registers: [register],
});

/**
 * Google Forms Circuit Breaker State Changes Total Counter
 *
 * Tracks circuit breaker state transitions for Google Forms API.
 * Labels:
 * - state: "open", "halfOpen", or "close"
 * - circuit: Name of the circuit breaker (e.g., "getForms", "getResponses")
 *
 * Phase 5.1 - Week 2, Task 2.5: Circuit Breaker for Google Forms API (Issue #10)
 */
export const gforms_circuit_breaker_state_changes_total = new Counter({
  name: 'gforms_circuit_breaker_state_changes_total',
  help: 'Total number of Google Forms circuit breaker state changes',
  labelNames: ['state', 'circuit'],
  registers: [register],
});
