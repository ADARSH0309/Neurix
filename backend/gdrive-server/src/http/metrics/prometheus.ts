/**
 * Prometheus Metrics Collection
 *
 * Collects key operational metrics:
 * 1. OAuth success/failure rate
 * 2. Token generation rate
 * 3. MCP request latency
 * 4. Redis connection pool usage
 * 5. Rate limit trigger count
 * 6. Google Drive circuit breaker state changes
 */

import { Registry, Counter, Histogram, Gauge } from 'prom-client';

/**
 * Prometheus Registry
 */
export const register = new Registry();

/**
 * OAuth Requests Total Counter
 */
export const oauth_requests_total = new Counter({
  name: 'oauth_requests_total',
  help: 'Total number of OAuth requests by status and flow type',
  labelNames: ['status', 'flow_type'],
  registers: [register],
});

/**
 * Token Generation Total Counter
 */
export const token_generation_total = new Counter({
  name: 'token_generation_total',
  help: 'Total number of bearer token generation attempts by status',
  labelNames: ['status'],
  registers: [register],
});

/**
 * MCP Request Duration Histogram
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
 */
export const redis_connections_active = new Gauge({
  name: 'redis_connections_active',
  help: 'Number of active Redis connections (1=connected, 0=disconnected)',
  registers: [register],
});

/**
 * Rate Limit Hits Total Counter
 */
export const rate_limit_hits_total = new Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of rate limit hits by limiter type',
  labelNames: ['limiter_type'],
  registers: [register],
});

/**
 * Google Drive Circuit Breaker State Changes Total Counter
 */
export const gdrive_circuit_breaker_state_changes_total = new Counter({
  name: 'gdrive_circuit_breaker_state_changes_total',
  help: 'Total number of Google Drive circuit breaker state changes',
  labelNames: ['state', 'circuit'],
  registers: [register],
});
