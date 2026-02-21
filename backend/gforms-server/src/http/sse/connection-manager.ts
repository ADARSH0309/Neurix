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
 *
 * MCP SSE Transport Pattern:
 * 1. Client connects via GET request (SSE)
 * 2. Server sends "endpoint" event with POST URL
 * 3. Client sends requests via POST
 * 4. Server sends responses via SSE "message" events
 *
 * Bug #3 Fix: Added proper heartbeat lifecycle management with start/stop
 * methods to prevent memory leaks and enable graceful shutdown.
 *
 * Phase 5.1 - Week 2, Task 2.1: Connection Limits (Issue #6)
 * - MAX_CONNECTIONS_PER_USER: 5 connections per user
 * - MAX_TOTAL_CONNECTIONS: 1000 total connections globally
 * - Prevents resource exhaustion attacks
 */
export class SSEConnectionManager {
  // Phase 5.1 - Week 2, Task 2.1: Connection limit constants
  private static readonly MAX_CONNECTIONS_PER_USER = 5;
  private static readonly MAX_TOTAL_CONNECTIONS = 1000;

  private connections: Map<string, SSEConnection> = new Map();
  private userConnections: Map<string, Set<string>> = new Map();
  private heartbeatTimer: NodeJS.Timeout | null = null;

  /**
   * Create new SSE connection
   *
   * Phase 5.1 - Week 2, Task 2.1: Connection Limits (Issue #6)
   * - Enforces MAX_TOTAL_CONNECTIONS global limit
   * - Enforces MAX_CONNECTIONS_PER_USER per-user limit
   * - Closes oldest connection when per-user limit exceeded
   */
  createConnection(userEmail: string, response: Response): string {
    // Phase 5.1 - Week 2, Task 2.1: Check global connection limit
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

    // Phase 5.1 - Week 2, Task 2.1: Check per-user connection limit
    const userConns = this.getUserConnections(userEmail);
    if (userConns.length >= SSEConnectionManager.MAX_CONNECTIONS_PER_USER) {
      // Close oldest connection for this user
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

      // Close the oldest connection
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

    // Track user connections
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

  /**
   * Get connection by ID
   */
  getConnection(connectionId: string): SSEConnection | undefined {
    const conn = this.connections.get(connectionId);
    if (conn) {
      conn.lastActivity = new Date();
    }
    return conn;
  }

  /**
   * Get all connections for a user
   */
  getUserConnections(userEmail: string): SSEConnection[] {
    const connectionIds = this.userConnections.get(userEmail) || new Set();
    return Array.from(connectionIds)
      .map(id => this.connections.get(id))
      .filter((conn): conn is SSEConnection => conn !== undefined);
  }

  /**
   * Remove connection
   */
  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Remove from user connections
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

  /**
   * Send SSE event to connection
   */
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

  /**
   * Send message event (JSON-RPC response)
   */
  sendMessage(connectionId: string, message: any): boolean {
    return this.sendEvent(connectionId, 'message', message);
  }

  /**
   * Send endpoint event (MCP SSE transport initial message)
   */
  sendEndpoint(connectionId: string, endpoint: string): boolean {
    return this.sendEvent(connectionId, 'endpoint', { uri: endpoint });
  }

  /**
   * Send ping/heartbeat
   */
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

  /**
   * Send heartbeat to all connections
   */
  heartbeat(): void {
    const now = new Date();
    const timeout = 55000; // 55 seconds

    for (const [connectionId, connection] of this.connections) {
      const elapsed = now.getTime() - connection.lastActivity.getTime();

      if (elapsed > timeout) {
        // Send ping
        if (!this.sendPing(connectionId)) {
          // Connection failed, remove it
          this.removeConnection(connectionId);
        }
      }
    }
  }

  /**
   * Get connection stats
   */
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

  /**
   * Start heartbeat timer (Bug #3 Fix)
   * Starts sending periodic pings to all connections
   */
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
    }, 30000); // 30 seconds

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'SSE heartbeat started',
      interval: '30s',
    }));
  }

  /**
   * Stop heartbeat timer (Bug #3 Fix)
   * Cleans up the interval timer
   */
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

  /**
   * Graceful shutdown (Bug #3 Fix)
   * Closes all connections and stops heartbeat
   */
  async shutdown(): Promise<void> {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Shutting down SSE connection manager',
      activeConnections: this.connections.size,
    }));

    // Stop heartbeat first
    this.stopHeartbeat();

    // Close all connections
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

    // Clear all connection maps
    this.connections.clear();
    this.userConnections.clear();

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'SSE connection manager shutdown complete',
    }));
  }
}

// Singleton instance
export const sseConnectionManager = new SSEConnectionManager();

// Bug #3 Fix: Start heartbeat using the new lifecycle method
// This allows proper cleanup during graceful shutdown
sseConnectionManager.startHeartbeat();
