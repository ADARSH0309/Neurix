# Gmail MCP Server

A production-ready Model Context Protocol (MCP) server for Gmail integration, enabling AI assistants to read, send, and manage emails through natural language commands.

## Overview

Gmail MCP Server provides a standardized interface for AI models to interact with Gmail, following the MCP specification. It supports both STDIO transport (for desktop applications) and HTTP transport (for web applications).

## Features

### Email Operations
- **List Messages**: View inbox, sent, starred, and trashed messages
- **Read Messages**: Get full email content with attachments
- **Send Messages**: Compose and send new emails
- **Reply/Forward**: Respond to existing conversations
- **Search**: Find emails using Gmail search syntax
- **Archive/Delete**: Manage email lifecycle
- **Labels**: Create, update, and apply labels

### Thread Management
- List conversation threads
- View complete thread history
- Trash/delete threads

### Draft Management
- Create and edit drafts
- Send drafts
- List all drafts

### Security Features
- OAuth 2.1 with PKCE authentication
- Session management with dual timeout (absolute + idle)
- Rate limiting (global, per-user, per-tool)
- Input validation with Zod schemas
- Circuit breaker pattern for resilience

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm
- Google Cloud Project with Gmail API enabled
- Redis (optional, for distributed sessions)

### Installation

```bash
cd backend/gmail-server
pnpm install
pnpm build
```

### Configuration

Create a `.env` file:

```env
# Google OAuth (Required)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8082/auth/gmail/callback

# Token Storage
TOKEN_PATH=./token.json

# Server Configuration
PORT=8082
LOG_LEVEL=info
NODE_ENV=development

# Redis (Optional - for distributed sessions)
REDIS_URL=redis://localhost:6379

# CORS (for HTTP mode)
CORS_ORIGIN=http://localhost:5173
```

### Running the Server

**STDIO Mode** (for Claude Desktop, VS Code):
```bash
pnpm start
```

**HTTP Mode** (for web applications):
```bash
pnpm start:http
```

**Manual OAuth Setup**:
```bash
pnpm oauth-setup
```

## Architecture

```
gmail-server/
├── src/
│   ├── index.ts              # STDIO entry point
│   ├── server.ts             # MCP server class
│   ├── gmail-client.ts       # Gmail API wrapper
│   ├── types.ts              # TypeScript interfaces
│   ├── oauth-setup.ts        # Manual OAuth setup
│   ├── http/
│   │   ├── index.ts          # HTTP server entry point
│   │   └── public/
│   │       └── test.html     # Web test interface
│   ├── lib/
│   │   ├── errors.ts         # Custom error classes
│   │   ├── logger.ts         # Structured logging
│   │   ├── metrics.ts        # Prometheus metrics
│   │   └── retry.ts          # Retry with backoff
│   ├── session/
│   │   └── session-manager.ts # Session management
│   └── utils/
│       └── circuit-breaker.ts # Circuit breaker pattern
├── dist/                      # Compiled output
├── package.json
├── tsconfig.json
└── README.md
```

## Available Tools

### Message Operations

| Tool | Description |
|------|-------------|
| `list_messages` | List messages with optional filters |
| `get_message` | Get full message details |
| `send_message` | Send a new email |
| `reply_to_message` | Reply to an existing message |
| `forward_message` | Forward a message |
| `search_messages` | Search using Gmail syntax |
| `trash_message` | Move to trash |
| `untrash_message` | Restore from trash |
| `delete_message` | Permanently delete |
| `mark_as_read` | Mark message as read |
| `mark_as_unread` | Mark message as unread |
| `star_message` | Star a message |
| `unstar_message` | Remove star |
| `archive_message` | Archive (remove from inbox) |
| `modify_labels` | Add/remove labels |
| `get_unread` | Get unread messages |
| `get_sent` | Get sent messages |
| `get_starred` | Get starred messages |
| `get_trashed` | Get trashed messages |

### Thread Operations

| Tool | Description |
|------|-------------|
| `list_threads` | List conversation threads |
| `get_thread` | Get thread with all messages |
| `trash_thread` | Move thread to trash |
| `delete_thread` | Permanently delete thread |

### Label Operations

| Tool | Description |
|------|-------------|
| `list_labels` | List all labels |
| `create_label` | Create a new label |
| `update_label` | Update label properties |
| `delete_label` | Delete a label |

### Draft Operations

| Tool | Description |
|------|-------------|
| `list_drafts` | List all drafts |
| `create_draft` | Create a new draft |
| `delete_draft` | Delete a draft |
| `send_draft` | Send a draft |

### Other

| Tool | Description |
|------|-------------|
| `get_profile` | Get Gmail account info |
| `get_attachment` | Download attachment |

## API Examples

### JSON-RPC Request Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "send_message",
    "arguments": {
      "to": "recipient@example.com",
      "subject": "Hello from MCP",
      "body": "This email was sent via Gmail MCP Server!"
    }
  }
}
```

### Response Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{
      "type": "text",
      "text": "Email sent successfully!\n\nMessage ID: abc123\nThread ID: xyz789"
    }]
  }
}
```

## HTTP Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | POST | MCP JSON-RPC endpoint |
| `/health` | GET | Health check |
| `/metrics` | GET | Prometheus metrics |
| `/auth/login` | GET | Start OAuth flow |
| `/auth/gmail/callback` | GET | OAuth callback |
| `/test.html` | GET | Web test interface |

## Monitoring

### Health Check

```bash
curl http://localhost:8082/health
```

Response:
```json
{
  "status": "healthy",
  "service": "gmail-mcp-server",
  "version": "0.1.0",
  "authenticated": true
}
```

### Prometheus Metrics

```bash
curl http://localhost:8082/metrics
```

Available metrics:
- `gmail_mcp_tool_calls_total` - Total tool calls by tool and status
- `gmail_mcp_tool_call_duration_seconds` - Tool call latency histogram
- `gmail_mcp_active_sessions` - Current active sessions
- `gmail_mcp_gmail_api_calls_total` - Gmail API calls by operation
- `gmail_mcp_circuit_breaker_state` - Circuit breaker states
- `gmail_mcp_errors_total` - Errors by type

## Security

### OAuth 2.1 with PKCE

The server implements OAuth 2.1 with PKCE for secure authentication:

1. User visits `/auth/login`
2. Redirected to Google with PKCE challenge
3. After approval, callback receives authorization code
4. Code exchanged for tokens with PKCE verifier
5. Tokens stored securely in session

### Session Management

- **Absolute Timeout**: 4 hours maximum session lifetime
- **Idle Timeout**: 30 minutes of inactivity
- **Token Refresh**: Automatic refresh 5 minutes before expiration

### Rate Limiting

- Global: 100 requests/minute
- Per-user: Configurable limits
- Per-tool: Specific limits for sensitive operations

### Input Validation

All inputs validated with Zod schemas before processing.

## Error Handling

### Error Classes

| Error | Code | Description |
|-------|------|-------------|
| `ValidationError` | 400 | Invalid input |
| `AuthenticationError` | 401 | Auth failed |
| `PermissionError` | 403 | Insufficient permissions |
| `NotFoundError` | 404 | Resource not found |
| `RateLimitError` | 429 | Rate limit exceeded |
| `ServiceUnavailableError` | 503 | External service down |
| `GmailApiError` | varies | Gmail API specific error |

### Circuit Breaker

Protects against Gmail API failures:
- Opens after 50% error rate (5+ requests)
- Stays open for 30 seconds
- Half-open state tests recovery
- Metrics track state changes

## Development

### Running Tests

```bash
pnpm test
```

### Building

```bash
pnpm build
```

### Watch Mode

```bash
pnpm dev
```

### Linting

```bash
pnpm lint
```

## Deployment

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 8082
CMD ["node", "dist/http/index.js"]
```

### Environment Variables for Production

```env
NODE_ENV=production
LOG_LEVEL=info
REDIS_URL=redis://your-redis-host:6379
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://your-domain.com/auth/gmail/callback
```

## Claude Desktop Integration

Add to Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "gmail": {
      "command": "node",
      "args": ["/path/to/gmail-server/dist/index.js"],
      "env": {
        "GOOGLE_CLIENT_ID": "your-client-id",
        "GOOGLE_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

## Troubleshooting

### OAuth Issues

**"Invalid redirect URI"**
- Ensure `GOOGLE_REDIRECT_URI` matches Google Cloud Console settings exactly

**"Code expired"**
- Authorization codes expire in 5-10 minutes
- Restart OAuth flow

### Rate Limiting

**"Rate limit exceeded"**
- Wait for `Retry-After` duration
- Implement exponential backoff in client

### Circuit Breaker Open

**"Service unavailable"**
- Gmail API experiencing issues
- Wait 30 seconds for circuit to close
- Check Gmail API status page

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes following the coding standards
4. Write tests for new functionality
5. Submit a pull request

---

Built with the Model Context Protocol (MCP) specification.
