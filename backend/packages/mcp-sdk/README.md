# Neurix MCP SDK

Shared base server class for building MCP-compliant servers in the Neurix monorepo.

## Usage

```typescript
import { NeurixBaseServer } from '@neurix/mcp-sdk';

class MyServer extends NeurixBaseServer {
  protected async listTools() { /* ... */ }
  protected async callTool(name, args) { /* ... */ }
  // ...
}
```

## Features

- Base server with stdio transport
- Structured JSON logging
- Tool, resource, and prompt handler registration
- Loose type support for ergonomic server implementations
