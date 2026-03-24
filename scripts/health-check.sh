#!/bin/bash
# Health check for all MCP servers

SERVERS=("gdrive:8080" "gforms:8081" "gmail:8082" "gcalendar:8083" "gtask:8084" "gsheets:8085")

echo "=== Neurix Health Check ==="
for server in "${SERVERS[@]}"; do
  name="${server%%:*}"
  port="${server##*:}"
  response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${port}/health" 2>/dev/null)
  if [ "$response" = "200" ]; then
    echo "  ${name} (${port}): healthy"
  else
    echo "  ${name} (${port}): unhealthy (HTTP ${response})"
  fi
done
echo "Frontend: http://localhost:9000"
