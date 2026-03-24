# Neurix Architecture

## Overview

Neurix is a monorepo platform that provides a unified chat interface for interacting with Google Workspace services through Model Context Protocol (MCP) servers.

## Monorepo Structure

```
neurix/
├── frontend/
│   ├── client/          # React + Vite SPA
│   └── server/          # Express server (port 9000)
├── backend/
│   ├── shared/mcp-sdk/  # Base MCP server class
│   ├── gdrive-server/   # Google Drive (port 8080)
│   ├── gforms-server/   # Google Forms (port 8081)
│   ├── gmail-server/    # Gmail (port 8082)
│   ├── gcalendar-server/# Google Calendar (port 8083)
│   ├── gtask-server/    # Google Tasks (port 8084)
│   └── gsheets-server/  # Google Sheets (port 8085)
```

## Frontend

- **Framework:** React 18 + TypeScript + Vite
- **State:** React Context (ServerContext, ChatContext, UIContext)
- **LLM:** Groq (llama-3.3-70b-versatile) via OpenAI SDK
- **Styling:** Tailwind CSS + shadcn/ui
- **Tool routing:** `serverId__toolName` prefix pattern

## Backend MCP Servers

Each server follows the same architecture:
- Extends `NeurixBaseServer` from `@neurix/mcp-sdk`
- Dual entry: stdio (for MCP clients) + HTTP (Express, for web)
- OAuth 2.1 with PKCE, Redis sessions, bearer tokens
- Rate limiting, Prometheus metrics, GDPR compliance
- SSE + Streamable HTTP transport support

## Communication Flow

1. User sends message → ChatContext
2. ChatContext routes to Groq LLM with MCP tool definitions
3. LLM returns function calls with `serverId__toolName` prefix
4. Frontend extracts serverId, calls tool via JSON-RPC to MCP server
5. MCP server executes Google API call, returns formatted result
6. Frontend formats response with service-specific formatters
