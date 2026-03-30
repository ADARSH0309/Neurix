# Neurix — Docker Deployment Guide

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose v2+
- Google Cloud OAuth credentials for each MCP service you want to use

## Quick Start

### 1. Configure environment variables

Each backend server needs a `.env` file with Google OAuth credentials. Copy the examples and fill in your values:

```bash
for srv in gdrive gforms gmail gcalendar gtask gsheets; do
  cp backend/${srv}-server/.env.example backend/${srv}-server/.env
done
```

Required variables in each `.env`:

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | OAuth client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `GOOGLE_REDIRECT_URI` | `http://localhost:<port>/auth/callback` |
| `ENCRYPTION_KEY` | 64-character hex string for session encryption |

Generate an encryption key:

```bash
openssl rand -hex 32
```

### 2. Start all services

```bash
docker compose up --build
```

This starts:

| Service | Port | Description |
|---------|------|-------------|
| Redis | 6379 | Session storage |
| Google Drive | 8080 | Drive MCP server |
| Google Forms | 8081 | Forms MCP server |
| Gmail | 8082 | Gmail MCP server |
| Google Calendar | 8083 | Calendar MCP server |
| Google Tasks | 8084 | Tasks MCP server |
| Google Sheets | 8085 | Sheets MCP server |
| Frontend | **9000** | Web UI |

Open **http://localhost:9000** in your browser.

### 3. Verify services

```bash
# Check all containers are running
docker compose ps

# Check health of a specific service
curl http://localhost:9000/health
curl http://localhost:8080/health
```

## Common Operations

```bash
# Start in background
docker compose up -d --build

# View logs
docker compose logs -f frontend
docker compose logs -f gmail

# Restart a single service
docker compose restart gmail

# Stop everything
docker compose down

# Stop and remove volumes (clears Redis data)
docker compose down -v

# Rebuild a single service
docker compose build gmail && docker compose up -d gmail
```

## Environment Variables

The frontend container uses Docker service names to reach backends. These are set automatically in `docker-compose.yml`:

```
GDRIVE_SERVER_URL=http://gdrive:8080
GFORMS_SERVER_URL=http://gforms:8081
GMAIL_SERVER_URL=http://gmail:8082
GCALENDAR_SERVER_URL=http://gcalendar:8083
GTASK_SERVER_URL=http://gtask:8084
GSHEETS_SERVER_URL=http://gsheets:8085
```

## Troubleshooting

**Container exits immediately:** Check logs with `docker compose logs <service>`. Usually a missing env var.

**Redis connection refused:** Redis must be healthy before backends start. Run `docker compose up redis` first and wait for the healthcheck.

**OAuth callback fails:** Ensure `GOOGLE_REDIRECT_URI` in each `.env` matches the port the service is running on (e.g. `http://localhost:8082/auth/callback` for Gmail).
