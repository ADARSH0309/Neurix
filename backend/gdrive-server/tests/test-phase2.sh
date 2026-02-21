#!/bin/bash

# Phase 2 Automated Test Script
# Tests that don't require browser OAuth flow

BASE_URL="http://localhost:3000"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

function run_test() {
  local test_name="$1"
  local test_command="$2"
  local expected_pattern="$3"

  TESTS_RUN=$((TESTS_RUN + 1))
  echo -ne "${BLUE}Test $TESTS_RUN: $test_name${NC}... "

  RESPONSE=$(eval "$test_command" 2>&1)

  if echo "$RESPONSE" | grep -q "$expected_pattern"; then
    echo -e "${GREEN}PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
  else
    echo -e "${RED}FAIL${NC}"
    echo -e "${YELLOW}Expected pattern: $expected_pattern${NC}"
    echo -e "${YELLOW}Got: $RESPONSE${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
  fi
}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Google Drive MCP Server - Phase 2 Tests${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Suite 1: Server Availability
echo -e "${YELLOW}=== Suite 1: Server Availability ===${NC}"

run_test "Health endpoint responds" \
  "curl -s $BASE_URL/health" \
  "healthy"

run_test "Root endpoint shows server info" \
  "curl -s $BASE_URL/" \
  "gdrive\|drive\|Google Drive"

echo ""

# Suite 2: Unauthenticated Access (Security)
echo -e "${YELLOW}=== Suite 2: Unauthenticated Access ===${NC}"

run_test "Auth status without cookie shows unauthenticated" \
  "curl -s $BASE_URL/auth/status" \
  "authenticated.*false"

run_test "MCP initialize without auth returns 401" \
  "curl -s -X POST $BASE_URL/ -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\"}'" \
  "32000"

run_test "MCP tools/list without auth returns 401" \
  "curl -s -X POST $BASE_URL/ -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/list\"}'" \
  "No session cookie found"

run_test "MCP resources/list without auth returns 401" \
  "curl -s -X POST $BASE_URL/ -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"id\":3,\"method\":\"resources/list\"}'" \
  "32000"

echo ""

# Suite 3: Error Handling
echo -e "${YELLOW}=== Suite 3: Error Handling ===${NC}"

run_test "Invalid JSON-RPC version returns error" \
  "curl -s -X POST $BASE_URL/ -H 'Content-Type: application/json' -H 'Cookie: ubiq_session=fake' -d '{\"jsonrpc\":\"1.0\",\"id\":1,\"method\":\"initialize\"}'" \
  "32600"

run_test "Missing method returns error" \
  "curl -s -X POST $BASE_URL/ -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"id\":1}'" \
  "error"

run_test "Unknown method returns 404" \
  "curl -s -X POST $BASE_URL/ -H 'Content-Type: application/json' -H 'Cookie: ubiq_session=fake-session-id' -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"unknown_method\"}'" \
  "32601"

echo ""

# Suite 4: OAuth Endpoints
echo -e "${YELLOW}=== Suite 4: OAuth Endpoints ===${NC}"

run_test "Login endpoint redirects (returns 302 or Location)" \
  "curl -s -I $BASE_URL/auth/login | head -n 1" \
  "302\|Found"

run_test "Logout endpoint accepts POST" \
  "curl -s -X POST $BASE_URL/auth/logout" \
  "success\|Logged out"

echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Total tests run:    ${BLUE}$TESTS_RUN${NC}"
echo -e "Tests passed:       ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests failed:       ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "\n${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "\n${RED}✗ Some tests failed${NC}"
  exit 1
fi
