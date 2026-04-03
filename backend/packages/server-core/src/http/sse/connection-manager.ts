import { Response } from 'express';
import { randomUUID } from 'crypto';

export interface SSEConnection {
  id: string;
  userEmail: string;
  response: Response;
  connectedAt: Date;
  lastActivity: Date;
}

/**
 * Manages Server-Sent Events connections for MCP HTTP transport
 */
export class SSEConnectionManager {
  private static readonly MAX_CONNECTIONS_PER_USER = 5;
  private static readonly MAX_TOTAL_CONNECTIONS = 1000;

  private connections: Map<string, SSEConnection> = new Map();
  private userConnections: Map<string, Set<string>> = new Map();
  private heartbeatTimer: NodeJS.Timeout | null = null;

  createConnection(userEmail: string, response: Response): string {
    if (this.connections.size >= SSEConnectionManager.MAX_TOTAL_CONNECTIONS) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'SSE connection rejected: global limit reached',
        currentConnections: this.connections.size,
        maxConnections: SSEConnectionManager.MAX_TOTAL_CONNECTIONS,
        userEmail,
      }));
      throw new Error('Server at maximum capacity. Please try again later.');
    }

    const userConns = this.getUserConnections(userEmail);
    if (userConns.length >= SSEConnectionManager.MAX_CONNECTIONS_PER_USER) {
      const oldest = userConns.sort((a, b) =>
        a.connectedAt.getTime() - b.connectedAt.getTime()
      )[0];

      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: 'SSE connection limit reached for user, closing oldest',
        userEmail,
        userConnections: userConns.length,
        maxPerUser: SSEConnectionManager.MAX_CONNECTIONS_PER_USER,
        closedConnection: oldest.id,
        closedConnectionAge: new Date().getTime() - oldest.connectedAt.getTime(),
      }));

      try {
        oldest.response.end();
      } catch (error) {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: 'Error closing oldest SSE connection',
          connectionId: oldest.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      }

      this.removeConnection(oldest.id);
    }

    const connectionId = randomUUID();

    const connection: SSEConnection = {
      id: connectionId,
      userEmail,
      response,
      connectedAt: new Date(),
      lastActivity: new Date(),
    };

    this.connections.set(connectionId, connection);

    if (!this.userConnections.has(userEmail)) {
      this.userConnections.set(userEmail, new Set());
    }
    this.userConnections.get(userEmail)!.add(connectionId);

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'SSE connection created',
      connectionId,
      userEmail,
      totalConnections: this.connections.size,
      userConnections: this.userConnections.get(userEmail)!.size,
    }));

    return connectionId;
  }

  getConnection(connectionId: string): SSEConnection | undefined {
    const conn = this.connections.get(connectionId);
    if (conn) {
      conn.lastActivity = new Date();
    }
    return conn;
  }

  getUserConnections(userEmail: string): SSEConnection[] {
    const connectionIds = this.userConnections.get(userEmail) || new Set();
    return Array.from(connectionIds)
      .map(id => this.connections.get(id))
      .filter((conn): conn is SSEConnection => conn !== undefined);
  }

  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const userConns = this.userConnections.get(connection.userEmail);
    if (userConns) {
      userConns.delete(connectionId);
      if (userConns.size === 0) {
        this.userConnections.delete(connection.userEmail);
      }
    }

    this.connections.delete(connectionId);
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'SSE connection removed',
      connectionId,
    }));
  }

  sendEvent(connectionId: string, event: string, data: any): boolean {
    const connection = this.getConnection(connectionId);
    if (!connection) {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: 'Connection not found',
        connectionId,
      }));
      return false;
    }

    try {
      const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
      connection.response.write(`event: ${event}\n`);
      connection.response.write(`data: ${dataStr}\n\n`);
      connection.lastActivity = new Date();
      return true;
    } catch (error) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Error sending SSE event',
        connectionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
      this.removeConnection(connectionId);
      return false;
    }
  }

  sendMessage(connectionId: string, message: any): boolean {
    return this.sendEvent(connectionId, 'message', message);
  }

  sendEndpoint(connectionId: string, endpoint: string): boolean {
    return this.sendEvent(connectionId, 'endpoint', { uri: endpoint });
  }

  sendPing(connectionId: string): boolean {
    const connection = this.getConnection(connectionId);
    if (!connection) return false;

    try {
      connection.response.write(`: ping\n\n`);
      connection.lastActivity = new Date();
      return true;
    } catch (error) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Error sending ping',
        connectionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
      this.removeConnection(connectionId);
      return false;
    }
  }

  heartbeat(): void {
    const now = new Date();
    const timeout = 55000;

    for (const [connectionId, connection] of this.connections) {
      const elapsed = now.getTime() - connection.lastActivity.getTime();

      if (elapsed > timeout) {
        if (!this.sendPing(connectionId)) {
          this.removeConnection(connectionId);
        }
      }
    }
  }

  getStats() {
    return {
      totalConnections: this.connections.size,
      uniqueUsers: this.userConnections.size,
      connections: Array.from(this.connections.values()).map(conn => ({
        id: conn.id,
        userEmail: conn.userEmail,
        connectedAt: conn.connectedAt,
        lastActivity: conn.lastActivity,
        duration: new Date().getTime() - conn.connectedAt.getTime(),
      })),
    };
  }

  startHeartbeat(): void {
    if (this.heartbeatTimer) {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: 'Heartbeat already running, skipping start',
      }));
      return;
    }

    this.heartbeatTimer = setInterval(() => {
      this.heartbeat();
    }, 30000);

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'SSE heartbeat started',
      interval: '30s',
    }));
  }

  stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;

      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'SSE heartbeat stopped',
      }));
    }
  }

  async shutdown(): Promise<void> {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Shutting down SSE connection manager',
      activeConnections: this.connections.size,
    }));

    this.stopHeartbeat();

    for (const [connectionId, connection] of this.connections) {
      try {
        connection.response.end();
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'SSE connection closed',
          connectionId,
        }));
      } catch (error) {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: 'Error closing SSE connection',
          connectionId,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    }

    this.connections.clear();
    this.userConnections.clear();

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'SSE connection manager shutdown complete',
    }));
  }
}

export const sseConnectionManager = new SSEConnectionManager();

sseConnectionManager.startHeartbeat();
