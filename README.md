# Neurix

An AI-powered workstation built on the Model Context Protocol (MCP) that provides unified access to Google services through a conversational interface. Neurix integrates Google Drive, Gmail, Calendar, Forms, Tasks, and Sheets into a single, intelligent workspace.

## Overview

Neurix is a full-stack application designed to streamline interactions with Google's suite of productivity tools. Using natural language processing and intelligent command routing, users can manage their entire Google ecosystem through a single chat-based interface.

## Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, ShadCN UI
- **Backend:** Node.js, Express, TypeScript, JSON-RPC 2.0
- **Protocol:** Model Context Protocol (MCP)
- **Session Management:** Redis with encrypted token storage
- **Authentication:** Google OAuth 2.0 (PKCE Flow)
- **Observability:** Prometheus metrics and structured logging
- **Deployment:** Docker, Docker Compose
- **Package Management:** pnpm Monorepo

## Features

### Google Drive
Search, upload, organize, and share files. Manage folders and collaborate seamlessly.

### Gmail
Send, reply, and search emails. Manage drafts and labels with ease.

### Google Calendar
Create and manage events. Check availability in real-time.

### Google Forms
Build surveys and collect responses. Analyze data instantly.

### Google Tasks
Create and manage task lists. Track progress and update status.

### Google Sheets
Read and write spreadsheet data. Automate cell operations.

## Architecture

The application follows a microservices architecture where each Google service runs as an independent MCP server. Services communicate via JSON-RPC 2.0 protocol, and the frontend orchestrates all services through a central chat interface. Real-time communication is handled via Server-Sent Events (SSE), and session data is managed securely through Redis.

## Project Structure

```
Neurix/
├── backend/
│   ├── gdrive-server/
│   ├── gforms-server/
│   ├── gmail-server/
│   ├── gcalendar-server/
│   ├── gtask-server/
│   ├── gsheets-server/
│   └── shared/mcp-sdk/
├── frontend/
│   ├── client/
│   └── server/
└── pnpm-workspace.yaml
```

## Prerequisites

- Node.js 20 or higher
- pnpm package manager
- Google Cloud Project with OAuth 2.0 credentials

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/ADARSH0309/Neurix.git
cd Neurix
pnpm install
```

## Configuration

1. Copy `.env.example` to `.env` in each backend service directory
2. Add your Google OAuth 2.0 credentials to the environment files

## Running the Application

Start individual backend services:

```bash
pnpm dev:gdrive       # localhost:8080
pnpm dev:gforms       # localhost:8081
pnpm dev:gmail        # localhost:8082
pnpm dev:gcalendar    # localhost:8083
pnpm dev:gtask        # localhost:8084
pnpm dev:gsheets      # localhost:8085
```

Start the frontend:

```bash
cd frontend/client
pnpm dev
# App available at http://localhost:9000
```

## How It Works

1. Connect to MCP servers for each Google service
2. Authenticate using Google OAuth 2.0
3. Enter commands in natural language
4. The system automatically routes requests to the appropriate service
5. Results are displayed in real-time through the chat interface

## Contributing

Contributions are welcome. To contribute:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License. See the LICENSE file for details.
