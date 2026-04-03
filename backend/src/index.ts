/**
 * Neurix Gateway — Single entry point for all 6 MCP services
 *
 * Boots one Express server on port 8080 with a unified OAuth flow.
 * All Google services (Drive, Gmail, Calendar, Forms, Tasks, Sheets)
 * are registered behind a single combined adapter.
 *
 * Tool routing: client sends "gmail__send_message" →
 *   gateway splits prefix → routes to Gmail adapter → calls send_message
 */

import { startServer } from '@neurix/server-core';
import { gatewayDefinition } from './gateway.js';

startServer(gatewayDefinition).catch((error) => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'error',
    message: 'Failed to start gateway',
    error: error.message,
    stack: error.stack,
  }));
  process.exit(1);
});
