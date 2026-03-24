# Google Tasks MCP Server

MCP server for Google Tasks integration. Provides tools for managing task lists and tasks.

## Setup

1. Copy `env.example` to `.env` and fill in Google OAuth credentials
2. Run `pnpm install`
3. Run `pnpm run oauth-setup` to authenticate
4. Run `pnpm start` (stdio) or `pnpm run start:http` (HTTP on port 8084)

## Tools

- **Task Lists:** list, get, create, update, delete
- **Tasks:** list, get, create, update, delete, complete, uncomplete, move, clear completed

## Environment Variables

| Variable | Description |
|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | OAuth callback URI |
| `PORT` | HTTP server port (default: 8084) |
| `REDIS_URL` | Redis connection URL |
