# Google Drive MCP Server End-to-End Testing Guide

## Overview

This document provides comprehensive testing instructions for the Google Drive MCP Server with OAuth 2.0 authentication and Redis session management.

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
   pnpm --filter @ubiq/gdrive-server build
   ```

## Test Suites

### Suite 1: Server Startup and Health

**Objective**: Verify the server starts correctly with all components initialized.

**Steps**:
1. Start the server:
   ```bash
   cd packages/gdrive-server
   node dist/http/index.js
   ```

2. Verify startup logs show:
   - "Starting Google Drive MCP Server"
   - "Redis client initialized"
   - "OAuth and session-based MCP initialized"
   - "Google Drive MCP Server started"

3. Test health endpoint:
   ```bash
   curl http://localhost:3000/health
   ```
   Expected: `{"status":"healthy",...}`

4. Test root endpoint:
   ```bash
   curl http://localhost:3000/
   ```
   Expected: JSON with server info and all OAuth endpoints listed

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
1. Grant consent on Google's screen (select Google Drive permissions)
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
      "name": "ubiq-gdrive-server",
      "version": "0.1.0"
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
Expected: Array of 24 tools (list_files, search_files, create_folder, upload_file, etc.)

**Test 4.3: List Resources**
```bash
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -H "Cookie: ubiq_session=YOUR_SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":3,"method":"resources/list"}'
```
Expected: Array of Google Drive folder resources

**Test 4.4: List Prompts**
```bash
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -H "Cookie: ubiq_session=YOUR_SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":4,"method":"prompts/list"}'
```
Expected: Array of prompts (organize_files, find_duplicates, storage_analysis)

**Test 4.5: Call Tool - List Files**
```bash
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -H "Cookie: ubiq_session=YOUR_SESSION_ID" \
  -d '{
    "jsonrpc":"2.0",
    "id":5,
    "method":"tools/call",
    "params":{
      "name":"list_files",
      "arguments":{"pageSize":5}
    }
  }'
```
Expected: List of files with metadata

**Test 4.6: Call Tool - Search Files**
```bash
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -H "Cookie: ubiq_session=YOUR_SESSION_ID" \
  -d '{
    "jsonrpc":"2.0",
    "id":6,
    "method":"tools/call",
    "params":{
      "name":"search_files",
      "arguments":{"query":"test","maxResults":5}
    }
  }'
```
Expected: Search results with file metadata

**Test 4.7: Call Tool - Get About (Storage Info)**
```bash
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -H "Cookie: ubiq_session=YOUR_SESSION_ID" \
  -d '{
    "jsonrpc":"2.0",
    "id":7,
    "method":"tools/call",
    "params":{
      "name":"get_about",
      "arguments":{}
    }
  }'
```
Expected: Google Drive account info with storage quota

**Success Criteria**: All MCP operations work correctly with authenticated session.

---

### Suite 5: File Operations

**Objective**: Test file creation, modification, and deletion operations.

**Test 5.1: Create Folder**
```bash
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -H "Cookie: ubiq_session=YOUR_SESSION_ID" \
  -d '{
    "jsonrpc":"2.0",
    "id":1,
    "method":"tools/call",
    "params":{
      "name":"create_folder",
      "arguments":{"name":"Test Folder"}
    }
  }'
```
Expected: Folder ID and web link returned

**Test 5.2: Upload Text File**
```bash
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -H "Cookie: ubiq_session=YOUR_SESSION_ID" \
  -d '{
    "jsonrpc":"2.0",
    "id":2,
    "method":"tools/call",
    "params":{
      "name":"upload_file",
      "arguments":{
        "name":"test.txt",
        "content":"Hello, this is a test file!"
      }
    }
  }'
```
Expected: File ID, name, size, and web link

**Test 5.3: Create Google Doc**
```bash
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -H "Cookie: ubiq_session=YOUR_SESSION_ID" \
  -d '{
    "jsonrpc":"2.0",
    "id":3,
    "method":"tools/call",
    "params":{
      "name":"create_google_doc",
      "arguments":{
        "name":"Test Document",
        "content":"This is the document content."
      }
    }
  }'
```
Expected: Google Doc ID and web link

**Test 5.4: Create Google Sheet**
```bash
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -H "Cookie: ubiq_session=YOUR_SESSION_ID" \
  -d '{
    "jsonrpc":"2.0",
    "id":4,
    "method":"tools/call",
    "params":{
      "name":"create_google_sheet",
      "arguments":{
        "name":"Test Spreadsheet",
        "content":"Name,Age,City\nJohn,30,NYC\nJane,25,LA"
      }
    }
  }'
```
Expected: Google Sheet ID and web link

**Test 5.5: Read File Content**
```bash
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -H "Cookie: ubiq_session=YOUR_SESSION_ID" \
  -d '{
    "jsonrpc":"2.0",
    "id":5,
    "method":"tools/call",
    "params":{
      "name":"read_file",
      "arguments":{"fileId":"YOUR_FILE_ID"}
    }
  }'
```
Expected: File content as text

**Test 5.6: Delete File (Move to Trash)**
```bash
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -H "Cookie: ubiq_session=YOUR_SESSION_ID" \
  -d '{
    "jsonrpc":"2.0",
    "id":6,
    "method":"tools/call",
    "params":{
      "name":"delete_file",
      "arguments":{"fileId":"YOUR_FILE_ID","permanent":false}
    }
  }'
```
Expected: Success message "File moved to trash"

**Success Criteria**: All file operations complete successfully.

---

### Suite 6: Sharing Operations

**Objective**: Test file sharing functionality.

**Test 6.1: Share File with User**
```bash
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -H "Cookie: ubiq_session=YOUR_SESSION_ID" \
  -d '{
    "jsonrpc":"2.0",
    "id":1,
    "method":"tools/call",
    "params":{
      "name":"share_file",
      "arguments":{
        "fileId":"YOUR_FILE_ID",
        "email":"user@example.com",
        "role":"reader",
        "type":"user"
      }
    }
  }'
```
Expected: Permission ID and details

**Test 6.2: List Permissions**
```bash
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -H "Cookie: ubiq_session=YOUR_SESSION_ID" \
  -d '{
    "jsonrpc":"2.0",
    "id":2,
    "method":"tools/call",
    "params":{
      "name":"list_permissions",
      "arguments":{"fileId":"YOUR_FILE_ID"}
    }
  }'
```
Expected: List of permissions with roles and emails

**Test 6.3: Unshare File**
```bash
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -H "Cookie: ubiq_session=YOUR_SESSION_ID" \
  -d '{
    "jsonrpc":"2.0",
    "id":3,
    "method":"tools/call",
    "params":{
      "name":"unshare_file",
      "arguments":{
        "fileId":"YOUR_FILE_ID",
        "permissionId":"YOUR_PERMISSION_ID"
      }
    }
  }'
```
Expected: Success message "Permission removed successfully"

**Success Criteria**: All sharing operations work correctly.

---

### Suite 7: Token Refresh

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

### Suite 8: Session Lifecycle

**Objective**: Test session creation, refresh, and logout.

**Test 8.1: Multiple Sessions**
1. Open two different browsers (e.g., Chrome + Firefox)
2. Complete OAuth flow in both browsers
3. Verify both have different session IDs
4. Make MCP requests from both browsers
5. Verify both work independently

**Test 8.2: Session Refresh**
```bash
# After using the session, check lastAccessedAt
curl http://localhost:3000/auth/status \
  -H "Cookie: ubiq_session=YOUR_SESSION_ID"
```
Expected: `lastAccessedAt` is updated after each request

**Test 8.3: Logout**
```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Cookie: ubiq_session=YOUR_SESSION_ID"
```
Expected: `{"success":true,"message":"Logged out successfully"}`

**Test 8.4: Verify Session Deleted**
```bash
# Try to use the session after logout
curl http://localhost:3000/auth/status \
  -H "Cookie: ubiq_session=YOUR_SESSION_ID"
```
Expected: `{"authenticated":false,"message":"Session expired or invalid"}`

**Test 8.5: Verify Redis Session Deleted**
```bash
redis-cli GET sess:{your-session-id}
```
Expected: `(nil)` (key deleted)

**Success Criteria**: Multiple sessions work independently, logout cleans up properly.

---

### Suite 9: Error Handling

**Objective**: Test error scenarios and edge cases.

**Test 9.1: Invalid JSON-RPC**
```bash
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -H "Cookie: ubiq_session=YOUR_SESSION_ID" \
  -d '{"jsonrpc":"1.0","id":1,"method":"initialize"}'
```
Expected: HTTP 400, JSON-RPC error code -32600

**Test 9.2: Unknown Method**
```bash
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -H "Cookie: ubiq_session=YOUR_SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":1,"method":"unknown_method"}'
```
Expected: HTTP 404, JSON-RPC error code -32601

**Test 9.3: Invalid Tool Parameters**
```bash
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -H "Cookie: ubiq_session=YOUR_SESSION_ID" \
  -d '{
    "jsonrpc":"2.0",
    "id":1,
    "method":"tools/call",
    "params":{"name":"share_file","arguments":{"fileId":"test","role":"invalid-role","type":"user"}}
  }'
```
Expected: Zod validation error

**Test 9.4: Non-existent File**
```bash
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -H "Cookie: ubiq_session=YOUR_SESSION_ID" \
  -d '{
    "jsonrpc":"2.0",
    "id":1,
    "method":"tools/call",
    "params":{"name":"get_file","arguments":{"fileId":"nonexistent-file-id"}}
  }'
```
Expected: Error message about file not found

**Success Criteria**: All error scenarios return proper error responses.

---

## Automated Test Script

Create `test-gdrive.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"
SESSION_ID=""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "=== Google Drive MCP Server End-to-End Tests ==="

# Test 1: Health
echo -n "Test 1: Health check... "
RESPONSE=$(curl -s $BASE_URL/health)
if echo "$RESPONSE" | grep -q "healthy"; then
  echo -e "${GREEN}PASS${NC}"
else
  echo -e "${RED}FAIL${NC}"
fi

# Test 2: Unauthenticated MCP
echo -n "Test 2: MCP without auth... "
RESPONSE=$(curl -s -X POST $BASE_URL/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}')
if echo "$RESPONSE" | grep -q "32000"; then
  echo -e "${GREEN}PASS${NC} (Correctly rejected)"
else
  echo -e "${RED}FAIL${NC}"
fi

# Test 3: Auth status (no cookie)
echo -n "Test 3: Auth status without cookie... "
RESPONSE=$(curl -s $BASE_URL/auth/status)
if echo "$RESPONSE" | grep -q "authenticated.*false"; then
  echo -e "${GREEN}PASS${NC}"
else
  echo -e "${RED}FAIL${NC}"
fi

echo ""
echo "Note: OAuth flow tests require manual browser interaction."
echo "After completing OAuth at $BASE_URL/auth/login, run:"
echo "  SESSION_ID=<your-session-id> ./test-gdrive.sh authenticated"
```

---

## Session Tests

Run session tests with:
```bash
npx tsx tests/test-session.ts
```

This tests:
1. Session creation
2. Session retrieval
3. Session update
4. OAuth token storage
5. Session count
6. Session refresh
7. Get all sessions
8. Session deletion
9. Deletion verification
10. Expired session cleanup

---

## Manual Test Checklist

- [ ] Server starts successfully with Redis connection
- [ ] Health endpoint responds
- [ ] Unauthenticated MCP requests are blocked (401)
- [ ] OAuth login redirects to Google
- [ ] OAuth callback stores tokens in Redis
- [ ] Authenticated MCP initialize works
- [ ] Authenticated tools/list works (24 tools)
- [ ] Authenticated resources/list works
- [ ] Authenticated prompts/list works (3 prompts)
- [ ] list_files tool works
- [ ] search_files tool works
- [ ] create_folder tool works
- [ ] upload_file tool works
- [ ] create_google_doc tool works
- [ ] create_google_sheet tool works
- [ ] read_file tool works
- [ ] delete_file tool works
- [ ] share_file tool works
- [ ] list_permissions tool works
- [ ] get_about tool works
- [ ] Token refresh happens automatically (check logs)
- [ ] Multiple concurrent sessions work
- [ ] Logout deletes session from Redis
- [ ] Invalid JSON-RPC version returns error
- [ ] Unknown methods return 404
- [ ] Invalid parameters trigger validation errors

---

## Available Tools Reference

The Google Drive MCP Server provides 24 tools:

### File Listing
- `list_files` - List files and folders
- `search_files` - Search for files
- `list_recent` - List recently viewed files
- `list_starred` - List starred files
- `list_shared_with_me` - List shared files
- `list_trashed` - List trashed files

### File Operations
- `get_file` - Get file metadata
- `read_file` - Read file content
- `create_folder` - Create a folder
- `upload_file` - Upload a file
- `create_google_doc` - Create a Google Doc
- `create_google_sheet` - Create a Google Sheet
- `create_presentation` - Create a Google Slides presentation
- `update_file` - Update file metadata/content
- `copy_file` - Copy a file
- `move_file` - Move a file
- `delete_file` - Delete/trash a file
- `restore_file` - Restore from trash
- `star_file` - Star/unstar a file
- `empty_trash` - Empty trash

### Sharing
- `share_file` - Share a file
- `unshare_file` - Remove sharing
- `list_permissions` - List file permissions

### Account
- `get_about` - Get account/storage info

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

**Issue: Permission denied on Drive operations**
- Solution: Verify OAuth scopes include `https://www.googleapis.com/auth/drive`

**Issue: File not found errors**
- Solution: Verify the file ID is correct and the user has access

---

## Performance Testing

For production readiness, consider:

1. **Load Testing**: Use `autocannon` or `k6` to test concurrent sessions
2. **Redis Performance**: Monitor Redis memory usage with multiple sessions
3. **Token Refresh Load**: Simulate many simultaneous token refreshes
4. **Session Cleanup**: Test expired session cleanup mechanism
5. **Large File Operations**: Test with files of various sizes
