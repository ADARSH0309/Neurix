<div align="center">

# Neurix

**AI-Powered MCP Workstation**

A universal chat interface that connects to Google Drive, Forms, Gmail, Calendar, Tasks & Sheets using Model Context Protocol (MCP). Manage files, send emails, create events, track tasks, build surveys, and edit spreadsheets — all through natural language.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![MCP](https://img.shields.io/badge/MCP-Protocol-FF5500)](https://modelcontextprotocol.io)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

</div>

---

### Features

- **Google Drive** — Search, create, share, and organize files and folders
- **Google Forms** — Create surveys, manage questions, analyze responses
- **Gmail** — Send, reply, search emails, manage labels and drafts
- **Google Calendar** — Create events, manage calendars, check availability
- **Google Tasks** — Create task lists, add/complete/delete tasks by name
- **Google Sheets** — Create, read, update spreadsheets and manage cells
- **Smart Routing** — Auto-routes commands to the correct server across all connected services
- **Chat Interface** — Multi-server chat with persistent sessions, command palette, and suggestions
- **OAuth 2.0** — Secure Google authentication with automatic token refresh

---

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Shadcn UI, Framer Motion |
| **Backend** | Node.js, Express, TypeScript, JSON-RPC 2.0 |
| **Protocol** | Model Context Protocol (MCP) |
| **Sessions** | Redis, encrypted token storage |
| **Auth** | Google OAuth 2.0 with PKCE |
| **Observability** | Prometheus metrics, structured logging, circuit breakers |
| **Deployment** | Docker, docker-compose per service |
| **Architecture** | pnpm monorepo |

---

### Project Structure

```
Neurix/
├── backend/
│   ├── gcalendar-server/   # Google Calendar MCP server  (port 8083)
│   ├── gdrive-server/      # Google Drive MCP server     (port 8080)
│   ├── gforms-server/      # Google Forms MCP server     (port 8081)
│   ├── gmail-server/       # Gmail MCP server            (port 8082)
│   ├── gsheets-server/     # Google Sheets MCP server    (port 8085)
│   ├── gtask-server/       # Google Tasks MCP server     (port 8084)
│   └── shared/mcp-sdk/     # Shared MCP utilities
├── frontend/
│   ├── client/             # React chat interface         (port 9000)
│   └── server/             # Express proxy server
└── pnpm-workspace.yaml
```

Each MCP server follows an identical structure:

```
<service>-server/
├── src/
│   ├── index.ts            # STDIO entry point
│   ├── server.ts           # MCP server class
│   ├── <service>-client.ts # Google API client
│   ├── types.ts            # TypeScript interfaces
│   ├── exchange-token.ts   # Token exchange
│   ├── oauth-setup.ts      # Manual OAuth setup
│   ├── http/               # HTTP transport (SSE, routes, middleware, OAuth, metrics)
│   ├── session/            # Redis session management
│   ├── lib/                # Errors, logger, metrics, retry logic
│   └── utils/              # Circuit breaker, encryption, sanitization
├── tests/                  # Encryption, session, integration tests
├── Dockerfile
├── docker-compose.yml
├── env.example
├── tsconfig.json
└── package.json
```

---

### Setup

**Prerequisites:** Node.js 20+, pnpm, Google Cloud Project with OAuth credentials

```bash
# Install dependencies
pnpm install

# Configure environment variables
# Copy .env.example files in each backend server and fill in your credentials

# Start all servers (each in a separate terminal)
pnpm dev:gdrive       # Google Drive    → localhost:8080
pnpm dev:gforms       # Google Forms    → localhost:8081
pnpm dev:gmail        # Gmail           → localhost:8082
pnpm dev:gcalendar    # Google Calendar → localhost:8083
pnpm dev:gtask        # Google Tasks    → localhost:8084
pnpm dev:gsheets      # Google Sheets   → localhost:8085

# Start frontend
cd frontend/client && pnpm dev   # → localhost:9000
```

---

### How It Works

1. Connect to one or more MCP servers (Drive, Forms, Gmail, Calendar, Tasks, Sheets)
2. Authenticate with Google OAuth
3. Use natural language to interact with your Google services
4. Smart routing automatically sends commands to the correct server
5. Results are formatted and displayed in the chat interface

---

### Example Commands

| Service | Command |
|---------|---------|
| **Drive** | `list my recent files`, `search for reports` |
| **Gmail** | `show unread emails`, `send email to user@example.com` |
| **Forms** | `list my forms`, `create form Project Feedback` |
| **Calendar** | `show today's events`, `create event Team Meeting` |
| **Tasks** | `list task lists`, `create task Buy groceries in Shopping` |
| **Sheets** | `list spreadsheets`, `read cells A1:D10 from Budget` |

---

<div align="center">

*Built with React, Node.js, and Model Context Protocol*

</div>
