# Google Calendar MCP Server

MCP server for Google Calendar integration. Provides 22 tools for managing calendars, events, scheduling, ACL, and settings.

## Setup

1. Copy `env.example` to `.env` and fill in Google OAuth credentials
2. Run `pnpm install`
3. Run `pnpm run oauth-setup` to authenticate
4. Run `pnpm start` (stdio) or `pnpm run start:http` (HTTP on port 8083)

## Tools

- **Calendar Management:** list, get, create, update, delete, clear
- **Event Management:** list, get, create, quick_add, update, delete, move, instances, search
- **Free/Busy:** check availability
- **ACL/Sharing:** list, get, share, update, unshare
- **Settings:** list, get, colors

## Environment Variables

| Variable | Description |
|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | OAuth callback URI |
| `PORT` | HTTP server port (default: 8083) |
| `REDIS_URL` | Redis connection URL |
