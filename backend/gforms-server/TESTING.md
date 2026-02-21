# Phase 2 End-to-End Testing Guide

## Overview

This document provides comprehensive testing instructions for Phase 2 of the Google Forms MCP Server with OAuth 2.0 authentication and Redis session management.

## Prerequisites

1. **Redis Running**: Ensure Redis is running via Docker Compose
   ```bash
   docker-compose up -d
   docker ps | grep redis  # Verify it's running
   ```

2. **Environment Variables**: Ensure `.env` file has:
   ```bash
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
   PORT=3000
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

3. **Build**: Ensure the server is built
   ```bash
   pnpm --filter @ubiq/gforms-server build
   ```

## Test Suites

### Suite 1: Server Startup and Health

**Objective**: Verify the server starts correctly with all components initialized.

**Steps**:
1. Start the server:
   ```bash
   cd packages/gforms-server
   node dist/http/index.js
   ```

2. Verify startup logs show:
   - "Starting Google Forms MCP Server (Phase 2 - OAuth with Sessions)"
   - "Redis client initialized"
   - "OAuth and session-based MCP initialized"
   - "Google Forms MCP Server started (Phase 2)"

3. Test health endpoint:
   ```bash
   curl http://localhost:3000/health
   ```
   Expected: `{"status":"healthy",...}`

4. Test root endpoint:
   ```bash
   curl http://localhost:3000/
   ```
   Expected: JSON with Phase 2 info and all OAuth endpoints listed

**Success Criteria**: Server starts without errors, Redis connects, all endpoints respond.

---

### Suite 2: Unauthenticated Access (Security)

**Objective**: Verify that MCP requests are properly blocked without authentication.

**Test 2.1: Auth Status (No Cookie)**
```bash
curl http://localhost:3000/auth/status
```
Expected: `{"authenticated":false,"message":"No session cookie found"}`

**Test 2.2: MCP Initialize (No Cookie)**
```bash
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}'
```
Expected: HTTP 401 with JSON-RPC error:
```json
{
  "jsonrpc": "2.0",
  "id": null,
  "error": {
    "code": -32000,
    "message": "No session cookie found. Please authenticate at /auth/login"
  }
}
```

**Test 2.3: MCP Tools List (No Cookie)**
```bash
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
```
Expected: Same 401 error

**Success Criteria**: All MCP operations return 401 without authentication.

---

### Suite 3: OAuth Flow (Browser-based)

**Objective**: Test the complete OAuth 2.0 flow with Google.

**Test 3.1: Initiate OAuth**
1. Open browser to: `http://localhost:3000/auth/login`
2. Verify redirect to Google OAuth consent screen
3. Check browser cookie: `ubiq_session` should be set
4. Note the session ID from the `state` parameter in the Google URL

**Test 3.2: Complete OAuth**
1. Grant consent on Google's screen
2. Verify redirect back to `http://localhost:3000/oauth2callback`
3. Verify success page displays:
   - Authentication Successful!
   - Your email address
   - Session ID
   - Session expiry time
4. Verify `ubiq_session` cookie is present in browser

**Test 3.3: Verify Session in Redis**
```bash
# In a new terminal
redis-cli
> KEYS sess:*
> GET sess:{your-session-id}
```
Expected: JSON session object with tokens, email, authenticated=true

**Test 3.4: Check Auth Status (Authenticated)**
```bash
curl http://localhost:3000/auth/status \
  -H "Cookie: ubiq_session=YOUR_SESSION_ID"
```
Expected:
```json
{
  "authenticated": true,
  "sessionId": "...",
  "userEmail": "your-email@gmail.com",
  "expiresAt": "...",
  "lastAccessedAt": "..."
}
```

**Success Criteria**: OAuth flow completes successfully, session created in Redis with tokens.

---

### Suite 4: Authenticated MCP Operations

**Objective**: Test all MCP methods with authenticated session.

**Setup**: Use the session cookie obtained from Suite 3.

**Test 4.1: Initialize**
```bash
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -H "Cookie: ubiq_session=YOUR_SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}'
```
Expected:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {...},
    "serverInfo": {
      "name": "gforms-mcp-server",
      "version": "1.0.0"
    }
  }
}
```

**Test 4.2: List Tools**
```bash
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -H "Cookie: ubiq_session=YOUR_SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
```
Expected: Array of 9 tools (list_forms, get_form, get_form_questions, list_responses, get_response, create_form, add_question, delete_item, update_form_title)

**Test 4.3: List Resources**
```bash
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -H "Cookie: ubiq_session=YOUR_SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":3,"method":"resources/list"}'
```
Expected: Array of Google Form resources

**Test 4.4: List Prompts**
```bash
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -H "Cookie: ubiq_session=YOUR_SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":4,"method":"prompts/list"}'
```
Expected: Array of prompts (create_survey, analyze_responses)

**Test 4.5: Call Tool - List Forms**
```bash
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -H "Cookie: ubiq_session=YOUR_SESSION_ID" \
  -d '{
    "jsonrpc":"2.0",
    "id":5,
    "method":"tools/call",
    "params":{
      "name":"list_forms",
      "arguments":{"pageSize":10}
    }
  }'
```
Expected: List of forms with metadata

**Success Criteria**: All MCP operations work correctly with authenticated session.

---

### Suite 5: Token Refresh

**Objective**: Test automatic token refresh mechanism.

**Note**: Token refresh happens automatically when tokens are about to expire (5-minute buffer). To test this properly:

**Option A: Wait for Token Expiry** (Not practical for testing)
- Tokens typically expire after 1 hour
- Wait ~55 minutes and make an MCP request
- Check server logs for "Refreshing expired access token"

**Option B: Manually Simulate Expiry**
1. Get current session from Redis:
   ```bash
   redis-cli GET sess:{your-session-id}
   ```

2. Manually update expiry_date to be expired:
   ```bash
   # In redis-cli
   redis-cli
   > GET sess:{your-session-id}
   # Copy the JSON, edit expiry_date to be Date.now() + 4*60*1000 (4 minutes from now)
   > SET sess:{your-session-id} '{...modified json...}' KEEPTTL
   ```

3. Make an MCP request:
   ```bash
   curl -X POST http://localhost:3000/ \
     -H "Content-Type: application/json" \
     -H "Cookie: ubiq_session=YOUR_SESSION_ID" \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
   ```

4. Check server logs for:
   ```json
   {"level":"info","message":"Refreshing expired access token",...}
   {"level":"info","message":"Access token refreshed successfully",...}
   ```

**Success Criteria**: Token refresh happens automatically and transparently.

---

### Suite 6: Session Lifecycle

**Objective**: Test session creation, refresh, and logout.

**Test 6.1: Multiple Sessions**
1. Open two different browsers (e.g., Chrome + Firefox)
2. Complete OAuth flow in both browsers
3. Verify both have different session IDs
4. Make MCP requests from both browsers
5. Verify both work independently

**Test 6.2: Session Refresh**
```bash
# After using the session, check lastAccessedAt
curl http://localhost:3000/auth/status \
  -H "Cookie: ubiq_session=YOUR_SESSION_ID"
```
Expected: `lastAccessedAt` is updated after each request

**Test 6.3: Logout**
```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Cookie: ubiq_session=YOUR_SESSION_ID"
```
Expected: `{"success":true,"message":"Logged out successfully"}`

**Test 6.4: Verify Session Deleted**
```bash
# Try to use the session after logout
curl http://localhost:3000/auth/status \
  -H "Cookie: ubiq_session=YOUR_SESSION_ID"
```
Expected: `{"authenticated":false,"message":"Session expired or invalid"}`

**Test 6.5: Verify Redis Session Deleted**
```bash
redis-cli GET sess:{your-session-id}
```
Expected: `(nil)` (key deleted)

**Success Criteria**: Multiple sessions work independently, logout cleans up properly.

---

### Suite 7: Error Handling

**Objective**: Test error scenarios and edge cases.

**Test 7.1: Invalid JSON-RPC**
```bash
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -H "Cookie: ubiq_session=YOUR_SESSION_ID" \
  -d '{"jsonrpc":"1.0","id":1,"method":"initialize"}'
```
Expected: HTTP 400, JSON-RPC error code -32600

**Test 7.2: Unknown Method**
```bash
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -H "Cookie: ubiq_session=YOUR_SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":1,"method":"unknown_method"}'
```
Expected: HTTP 404, JSON-RPC error code -32601

**Test 7.3: Invalid Tool Parameters**
```bash
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -H "Cookie: ubiq_session=YOUR_SESSION_ID" \
  -d '{
    "jsonrpc":"2.0",
    "id":1,
    "method":"tools/call",
    "params":{"name":"get_form","arguments":{}}
  }'
```
Expected: Zod validation error (missing formId)

**Test 7.4: Expired Session (24+ hours)**
- Cannot easily test without waiting 24 hours
- Session should automatically expire from Redis after TTL

**Success Criteria**: All error scenarios return proper error responses.

---

## Manual Test Checklist

- [ ] Server starts successfully with Redis connection
- [ ] Health endpoint responds
- [ ] Unauthenticated MCP requests are blocked (401)
- [ ] OAuth login redirects to Google
- [ ] OAuth callback stores tokens in Redis
- [ ] Authenticated MCP initialize works
- [ ] Authenticated tools/list works
- [ ] Authenticated resources/list works
- [ ] Authenticated prompts/list works
- [ ] Authenticated tools/call works (list_forms)
- [ ] Token refresh happens automatically (check logs)
- [ ] Multiple concurrent sessions work
- [ ] Logout deletes session from Redis
- [ ] Invalid JSON-RPC version returns error
- [ ] Unknown methods return 404
- [ ] Invalid parameters trigger validation errors

---

## Troubleshooting

**Issue: Redis connection refused**
- Solution: `docker-compose up -d`

**Issue: OAuth redirect URI mismatch**
- Solution: Verify `GOOGLE_REDIRECT_URI` matches Google Cloud Console

**Issue: Session not found after OAuth**
- Solution: Check Redis with `redis-cli KEYS sess:*`

**Issue: Token refresh fails**
- Solution: Verify refresh_token is present in session

---

## Performance Testing

For production readiness, consider:

1. **Load Testing**: Use `autocannon` or `k6` to test concurrent sessions
2. **Redis Performance**: Monitor Redis memory usage with multiple sessions
3. **Token Refresh Load**: Simulate many simultaneous token refreshes
4. **Session Cleanup**: Test expired session cleanup mechanism

---

## Next Steps

After all tests pass:
1. Document results in `docs/TEST_RESULTS.md`
2. Update `docs/PROJECT_STATUS.md`
3. Proceed to Week 2: Docker + AWS deployment
