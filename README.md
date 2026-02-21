<div align="center">

# Neurix

**AI Chat Platform with MCP Servers**

A universal chat interface that connects AI with Google Drive, Forms & Gmail using Model Context Protocol (MCP). Manage files, create documents, send emails, and build surveys — all through natural language.

</div>

---

### Features

- **Google Drive** — Search, create, share, and organize files and folders
- **Google Calendar** — Create events, manage calendars, check availability
- **Google Forms** — Create surveys, manage questions, analyze responses
- **Gmail** — Send, reply, search emails, manage labels and drafts
- **Chat Interface** — Multi-server chat with persistent sessions and smart tool matching
- **OAuth 2.0** — Secure Google authentication with token management

---

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React, TypeScript, Vite, Tailwind CSS, Shadcn UI, Framer Motion |
| **Backend** | Node.js, Express, TypeScript, MCP SDK |
| **AI** | OpenAI API |
| **Auth** | Google OAuth 2.0 with PKCE |
| **Architecture** | pnpm monorepo |

---

### Project Structure

```
Neurix/
├── backend/
│   ├── gcalendar-server/   # Google Calendar MCP server
│   ├── gdrive-server/      # Google Drive MCP server
│   ├── gforms-server/      # Google Forms MCP server
│   ├── gmail-server/       # Gmail MCP server
│   └── shared/mcp-sdk/     # Shared MCP utilities
├── frontend/
│   ├── client/             # React chat interface
│   └── server/             # Express + OpenAI proxy
└── pnpm-workspace.yaml
```

---

### Setup

**Prerequisites:** Node.js 20+, pnpm, Google Cloud Project with OAuth credentials

```bash
# Install dependencies
pnpm install

# Configure environment variables
# Copy .env.example files in each backend server and fill in your credentials

# Start servers (each in a separate terminal)
pnpm dev:gdrive       # Google Drive server (port 8080)
pnpm dev:gforms       # Google Forms server (port 8081)
pnpm dev:gmail        # Gmail server (port 8082)
pnpm start:frontend   # Frontend server

# Start frontend dev server
cd frontend/client && pnpm dev
```

---

### How It Works

1. Connect to one or more MCP servers (Drive, Forms, Gmail)
2. Authenticate with Google OAuth
3. Use natural language to interact with your Google services
4. The platform routes commands to the right MCP server and returns results in chat

---

<div align="center">

*Built with React, Node.js, and Model Context Protocol*

</div>
