#!/bin/bash

# Phase 3 Bearer Token Authentication - Automated Tests
# Tests the token management API and bearer token authentication

set -e

echo "========================================"
echo "Phase 3: Bearer Token Auth Tests"
echo "Google Drive MCP Server"
echo "========================================"
echo ""

# Configuration
BASE_URL="${BASE_URL:-https://gdrive-mcp.example.com}"
SESSION_COOKIE="$1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
if [ -z "$SESSION_COOKIE" ]; then
  echo -e "${RED}ERROR: Session cookie required${NC}"
  echo ""
  echo "Usage: $0 <session_cookie>"
  echo ""
  echo "To get your session cookie:"
  echo "1. Open $BASE_URL/test in browser"
  echo "2. Complete OAuth login"
  echo "3. Open DevTools → Application → Cookies"
  echo "4. Copy value of 'ubiq_session' cookie"
  echo ""
  echo "Example:"
  echo "  $0 abc123-def456-ghi789"
  exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
  echo -e "${YELLOW}WARNING: jq not installed. Output will not be pretty-printed.${NC}"
  echo "Install with: brew install jq (macOS) or apt-get install jq (Linux)"
  echo ""
  JQ_CMD="cat"
else
  JQ_CMD="jq ."
fi

echo "Testing against: $BASE_URL"
echo "Session: ${SESSION_COOKIE:0:8}..."
echo ""

# Counter for test results
PASSED=0
FAILED=0

# Helper function to run test
run_test() {
  local test_num=$1
  local test_name=$2
  local expected_status=$3
  shift 3
  local curl_args=("$@")

  echo "========================================"
  echo "Test $test_num: $test_name"
  echo "========================================"

  # Run curl and capture response
  HTTP_CODE=$(curl -s -w "%{http_code}" -o /tmp/test_response.json "${curl_args[@]}")
  RESPONSE=$(cat /tmp/test_response.json)

  echo "HTTP Status: $HTTP_CODE"
  echo "Response:"
  echo "$RESPONSE" | $JQ_CMD
  echo ""

  # Check status code
  if [ "$HTTP_CODE" -eq "$expected_status" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Expected HTTP $expected_status"
    ((PASSED++))
    echo "true" > /tmp/test_pass
  else
    echo -e "${RED}✗ FAIL${NC} - Expected HTTP $expected_status, got $HTTP_CODE"
    ((FAILED++))
    echo "false" > /tmp/test_pass
  fi

  echo ""
}

#=============================================
# Test 1: Generate Token (Authenticated)
#=============================================

run_test "1" "Generate Bearer Token" 200 \
  -X POST "$BASE_URL/api/generate-token" \
  -H "Cookie: ubiq_session=$SESSION_COOKIE" \
  -H "Content-Type: application/json"

# Extract token for later tests
if [ "$(cat /tmp/test_pass)" = "true" ]; then
  TOKEN=$(cat /tmp/test_response.json | $JQ_CMD -r .token 2>/dev/null || echo "")
  if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo -e "${RED}ERROR: Could not extract token from response${NC}"
    exit 1
  fi
  echo "Generated token: $TOKEN"
  echo ""
else
  echo -e "${RED}FATAL: Token generation failed. Cannot continue tests.${NC}"
  exit 1
fi

#=============================================
# Test 2: List Tokens
#=============================================

run_test "2" "List Tokens" 200 \
  "$BASE_URL/api/tokens" \
  -H "Cookie: ubiq_session=$SESSION_COOKIE"

#=============================================
# Test 3: Get Token Info
#=============================================

run_test "3" "Get Token Info" 200 \
  "$BASE_URL/api/token/$TOKEN" \
  -H "Cookie: ubiq_session=$SESSION_COOKIE"

#=============================================
# Test 4: Bearer Token Auth - Initialize
#=============================================

run_test "4" "Bearer Auth - Initialize MCP" 200 \
  -X POST "$BASE_URL/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "test-script", "version": "1.0.0"}
    }
  }'

#=============================================
# Test 5: Bearer Token Auth - List Tools
#=============================================

run_test "5" "Bearer Auth - List Tools" 200 \
  -X POST "$BASE_URL/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'

# Verify 24 tools returned (Google Drive MCP Server has 24 tools)
if [ "$(cat /tmp/test_pass)" = "true" ]; then
  TOOL_COUNT=$(cat /tmp/test_response.json | $JQ_CMD -r '.result.tools | length' 2>/dev/null || echo "0")
  echo "Tools found: $TOOL_COUNT"
  if [ "$TOOL_COUNT" -eq 24 ]; then
    echo -e "${GREEN}✓ PASS${NC} - All 24 tools present"
  else
    echo -e "${RED}✗ FAIL${NC} - Expected 24 tools, got $TOOL_COUNT"
    ((FAILED++))
    ((PASSED--))
  fi
  echo ""
fi

#=============================================
# Test 6: Bearer Token Auth - List Resources
#=============================================

run_test "6" "Bearer Auth - List Resources" 200 \
  -X POST "$BASE_URL/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "resources/list"
  }'

#=============================================
# Test 7: Bearer Token Auth - List Prompts
#=============================================

run_test "7" "Bearer Auth - List Prompts" 200 \
  -X POST "$BASE_URL/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "prompts/list"
  }'

#=============================================
# Test 8: Invalid Bearer Token (Security)
#=============================================

run_test "8" "Invalid Token Rejected" 401 \
  -X POST "$BASE_URL/" \
  -H "Authorization: Bearer invalid-token-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/list"
  }'

#=============================================
# Test 9: Cookie Auth Still Works (Backward Compat)
#=============================================

run_test "9" "Cookie Auth Still Works" 200 \
  -X POST "$BASE_URL/" \
  -H "Cookie: ubiq_session=$SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 6,
    "method": "tools/list"
  }'

#=============================================
# Test 10: No Auth Rejected
#=============================================

run_test "10" "No Auth Rejected" 401 \
  -X POST "$BASE_URL/" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 7,
    "method": "tools/list"
  }'

#=============================================
# Test 11: Bearer Auth - Call Tool (list_files)
#=============================================

run_test "11" "Bearer Auth - Call list_files Tool" 200 \
  -X POST "$BASE_URL/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 8,
    "method": "tools/call",
    "params": {
      "name": "list_files",
      "arguments": {"pageSize": 5}
    }
  }'

#=============================================
# Test 12: Bearer Auth - Call Tool (get_about)
#=============================================

run_test "12" "Bearer Auth - Call get_about Tool" 200 \
  -X POST "$BASE_URL/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 9,
    "method": "tools/call",
    "params": {
      "name": "get_about",
      "arguments": {}
    }
  }'

#=============================================
# Test 13: Revoke Token
#=============================================

run_test "13" "Revoke Token" 200 \
  -X DELETE "$BASE_URL/api/token/$TOKEN" \
  -H "Cookie: ubiq_session=$SESSION_COOKIE"

#=============================================
# Test 14: Revoked Token Rejected
#=============================================

run_test "14" "Revoked Token Rejected" 401 \
  -X POST "$BASE_URL/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 10,
    "method": "tools/list"
  }'

#=============================================
# Test Summary
#=============================================

echo "========================================"
echo "Test Summary"
echo "========================================"
echo ""
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "Total: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
  exit 0
else
  echo -e "${RED}✗ SOME TESTS FAILED${NC}"
  exit 1
fi
