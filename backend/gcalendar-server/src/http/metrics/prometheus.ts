/**
 * Prometheus Metrics Collection
 */

import { Registry, Counter, Histogram, Gauge } from 'prom-client';

export const register = new Registry();

export const oauth_requests_total = new Counter({
  name: 'oauth_requests_total',
  help: 'Total number of OAuth requests by status and flow type',
  labelNames: ['status', 'flow_type'],
  registers: [register],
});

export const token_generation_total = new Counter({
  name: 'token_generation_total',
  help: 'Total number of bearer token generation attempts by status',
  labelNames: ['status'],
  registers: [register],
});

export const mcp_request_duration_seconds = new Histogram({
  name: 'mcp_request_duration_seconds',
  help: 'MCP request duration in seconds',
  labelNames: ['method', 'status'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

export const redis_connections_active = new Gauge({
  name: 'redis_connections_active',
  help: 'Number of active Redis connections (1=connected, 0=disconnected)',
  registers: [register],
});

export const rate_limit_hits_total = new Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of rate limit hits by limiter type',
  labelNames: ['limiter_type'],
  registers: [register],
});

export const gcalendar_circuit_breaker_state_changes_total = new Counter({
  name: 'gcalendar_circuit_breaker_state_changes_total',
  help: 'Total number of Google Calendar circuit breaker state changes',
  labelNames: ['state', 'circuit'],
  registers: [register],
});
