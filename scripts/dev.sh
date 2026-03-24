#!/bin/bash
# Start all MCP servers for development

echo "Starting Neurix development environment..."
echo ""

# Start backend servers in background
pnpm dev:gdrive &
pnpm dev:gforms &
pnpm dev:gmail &
pnpm dev:gcalendar &
pnpm dev:gtask &
pnpm dev:gsheets &

# Start frontend
pnpm start:frontend

# Cleanup on exit
trap "kill 0" EXIT
wait
