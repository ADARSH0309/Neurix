# Google Sheets MCP Server

MCP server for Google Sheets integration. Provides 27 tools for managing spreadsheets, reading/writing data, formatting, and sharing.

## Setup

1. Copy `env.example` to `.env` and fill in Google OAuth credentials
2. Run `pnpm install`
3. Run `pnpm run oauth-setup` to authenticate
4. Run `pnpm start` (stdio) or `pnpm run start:http` (HTTP on port 8085)

## Tools

- **Spreadsheet Management:** list, get, create, rename, delete, copy
- **Sheet Tabs:** list, add, delete, rename, duplicate
- **Cell Read/Write:** read_range, write_range, append_rows, clear_range, batch_read, batch_write
- **Row/Column Ops:** insert, delete, auto_resize
- **Formatting:** format_cells, merge, unmerge
- **Data Operations:** sort_range, find_replace
- **Sharing:** share, list_permissions, remove_permission

## Environment Variables

| Variable | Description |
|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | OAuth callback URI |
| `PORT` | HTTP server port (default: 8085) |
| `REDIS_URL` | Redis connection URL |
