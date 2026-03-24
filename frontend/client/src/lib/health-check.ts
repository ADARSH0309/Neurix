/**
 * Server health check utility
 */

export interface HealthStatus {
  healthy: boolean;
  latencyMs: number;
  error?: string;
}

export async function checkServerHealth(baseUrl: string): Promise<HealthStatus> {
  const start = Date.now();
  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    const latencyMs = Date.now() - start;

    if (response.ok) {
      return { healthy: true, latencyMs };
    }
    return { healthy: false, latencyMs, error: `HTTP ${response.status}` };
  } catch (error) {
    return {
      healthy: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function checkAllServers(
  servers: Record<string, { baseUrl: string }>
): Promise<Record<string, HealthStatus>> {
  const entries = Object.entries(servers);
  const results = await Promise.allSettled(
    entries.map(([, server]) => checkServerHealth(server.baseUrl))
  );

  const healthMap: Record<string, HealthStatus> = {};
  entries.forEach(([id], i) => {
    const result = results[i];
    healthMap[id] = result.status === 'fulfilled'
      ? result.value
      : { healthy: false, latencyMs: 0, error: 'Check failed' };
  });

  return healthMap;
}
