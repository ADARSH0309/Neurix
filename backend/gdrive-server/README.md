# Google Drive MCP Server

Enterprise-grade Google Drive integration for the Model Context Protocol (MCP).

## Features

### Tools (27 total)

**File Listing:**
- `list_files` - List files and folders with filtering and sorting
- `search_files` - Search by name or content
- `list_recent` - Recently viewed files
- `list_starred` - Starred files
- `list_shared_with_me` - Files shared with you
- `list_trashed` - Files in trash

**File Operations:**
- `get_file` - Get file metadata
- `read_file` - Read text file content
- `export_file` - Export Google Workspace files (Docs, Sheets, Slides) to PDF, DOCX, XLSX, etc.

**File Creation:**
- `create_folder` - Create new folder
- `upload_file` - Upload text/content files
- `create_google_doc` - Create Google Docs document
- `create_google_sheet` - Create Google Sheets spreadsheet
- `create_google_slides` - Create Google Slides presentation

**File Modification:**
- `update_file` - Update file name/content/description
- `copy_file` - Copy a file
- `move_file` - Move file to different folder
- `delete_file` - Move to trash or permanently delete
- `restore_file` - Restore from trash
- `star_file` - Star/unstar files
- `empty_trash` - Empty trash

**Sharing:**
- `share_file` - Share with users, groups, domains, or make public
- `unshare_file` - Remove sharing permission
- `list_permissions` - List all permissions on a file

**Account:**
- `get_about` - Get storage quota and user info

### Resources
- Dynamic folder resources: `gdrive://folder/{folderId}`

### Prompts
- `organize_files` - Generate file organization plan
- `find_duplicates` - Find duplicate files
- `storage_analysis` - Analyze storage usage

## Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the **Google Drive API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Drive API"
   - Click "Enable"

### 2. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Desktop app" as application type
4. Name it (e.g., "MCP Drive Server")
5. Click "Create"
6. Download or copy the **Client ID** and **Client Secret**

### 3. Configure Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Select "External" user type
3. Fill in required fields (App name, User support email, Developer email)
4. Add scopes:
   - `https://www.googleapis.com/auth/drive`
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/drive.metadata.readonly`
5. Add your email as a test user

### 4. Create .env File

```bash
cd packages/gdrive-server
cp .env.example .env
```

Edit `.env`:
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/callback
TOKEN_PATH=./token.json
```

### 5. Build the Server

```bash
# From root directory
pnpm install
pnpm build

# Or just the gdrive-server
cd packages/gdrive-server
pnpm build
```

## Testing with MCP Inspector

### Method 1: HTTP Streamable (Recommended)

1. **Start the HTTP server:**
   ```bash
   cd packages/gdrive-server
   pnpm start:http
   ```
   Server runs at `http://localhost:3000`

2. **Open MCP Inspector:** https://modelcontextprotocol.io/inspector

3. **Configure connection:**
   - **Transport Type:** Streamable HTTP
   - **URL:** `http://localhost:3000/mcp`

4. **Click Connect**

5. **First time:** Browser opens automatically for Google OAuth
   - Sign in with your Google account
   - Grant permissions
   - See "Authentication Successful!" page
   - Return to MCP Inspector and click Connect again

6. **Use the tools:**
   - `list_files` - List your Drive files
   - `get_about` - See your storage quota
   - `search_files` - Search for files

### Method 2: STDIO Transport

1. Open MCP Inspector: https://modelcontextprotocol.io/inspector

2. Configure the server:
   - **Transport Type:** STDIO
   - **Command:** `node`
   - **Arguments:** `C:\path\to\packages\gdrive-server\dist\index.js`
   - **Environment Variables:**
     ```
     GOOGLE_CLIENT_ID=your-client-id
     GOOGLE_CLIENT_SECRET=your-client-secret
     GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/callback
     ```

3. Click **Connect**

4. **First time:** A browser window opens for Google authentication
   - Sign in and grant permissions
   - Return to MCP Inspector

### Method 3: Manual OAuth Setup

If automatic OAuth doesn't work:

```bash
cd packages/gdrive-server
pnpm oauth-setup
```

Follow the prompts to authenticate, then use MCP Inspector.

## Example Tool Usage

### List Files
```json
{
  "name": "list_files",
  "arguments": {
    "pageSize": 10,
    "orderBy": "modifiedTime desc"
  }
}
```

### Search Files
```json
{
  "name": "search_files",
  "arguments": {
    "query": "project report",
    "maxResults": 5
  }
}
```

### Create Folder
```json
{
  "name": "create_folder",
  "arguments": {
    "name": "My New Folder",
    "description": "Created via MCP"
  }
}
```

### Upload File
```json
{
  "name": "upload_file",
  "arguments": {
    "name": "notes.txt",
    "content": "Hello from MCP!",
    "mimeType": "text/plain"
  }
}
```

### Share File
```json
{
  "name": "share_file",
  "arguments": {
    "fileId": "file-id-here",
    "email": "user@example.com",
    "role": "reader",
    "type": "user"
  }
}
```

### Export Google Doc to PDF
```json
{
  "name": "export_file",
  "arguments": {
    "fileId": "google-doc-id",
    "format": "pdf"
  }
}
```

## Troubleshooting

### "Failed to load Drive credentials"
- Run `pnpm oauth-setup` to authenticate
- Check that `token.json` exists and is valid

### "Circuit breaker is open"
- Google Drive API is experiencing issues
- Wait 30 seconds and try again

### "Invalid redirect URI"
- Ensure `GOOGLE_REDIRECT_URI` matches exactly what's configured in Google Cloud Console
- Common values: `http://localhost:3000/oauth/callback`

### OAuth popup doesn't open
- Check that the `open` package is installed
- Try running `pnpm oauth-setup` manually

## Architecture

```
gdrive-server/
├── src/
│   ├── index.ts              # STDIO entry point with OAuth flow
│   ├── server.ts             # GDriveServer (extends UbiqBaseServer)
│   ├── gdrive-client.ts      # Google Drive API wrapper
│   ├── types.ts              # TypeScript interfaces
│   ├── oauth-setup.ts        # Manual OAuth setup script
│   ├── http/
│   │   ├── index.ts          # HTTP Streamable entry point
│   │   └── mcp-adapter.ts    # MCP protocol adapter for HTTP
│   └── utils/
│       └── circuit-breaker.ts # Circuit breaker for resilience
├── dist/                     # Compiled JavaScript
├── .env                      # Environment variables
├── .env.example              # Environment template
├── package.json
├── tsconfig.json
└── README.md
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm build` | Compile TypeScript |
| `pnpm start` | Run STDIO server |
| `pnpm start:http` | Run HTTP Streamable server (port 3000) |
| `pnpm oauth-setup` | Manual OAuth authentication |

## License

MIT
