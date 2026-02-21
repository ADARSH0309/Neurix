# Google Forms MCP Server

Enterprise-grade Google Forms integration for Model Context Protocol.

## Features

### Tools
- **list_forms**: List all Google Forms owned by the user
- **get_form**: Get details of a specific Google Form
- **get_form_questions**: Get all questions from a Google Form
- **list_responses**: List all responses for a Google Form
- **get_response**: Get a specific response from a Google Form
- **create_form**: Create a new Google Form
- **add_question**: Add a question to a Google Form
- **delete_item**: Delete an item (question) from a Google Form
- **update_form_title**: Update the title of a Google Form

### Resources
- Dynamic resources for each Google Form
- Access form details using `gforms://form/{formId}` URIs

### Prompts
- **create_survey**: Generate a survey form with questions based on a topic
- **analyze_responses**: Analyze and summarize form responses

## Setup

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable the Google Forms API and Google Drive API
4. Create OAuth 2.0 credentials:
   - Application type: Desktop app or Web application
   - Add authorized redirect URI: `http://localhost:3000/oauth/callback`
5. Download credentials or copy Client ID and Client Secret

### 2. Environment Configuration

Create a `.env` file in the `packages/gforms-server` directory:

```bash
cp .env.example .env
```

Edit `.env` with your Google OAuth credentials:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/callback
TOKEN_PATH=./token.json
```

### 3. Install Dependencies

From the repository root:

```bash
pnpm install
```

### 4. Build

```bash
# Build all packages
pnpm build

# Or build just Google Forms server
cd packages/gforms-server
pnpm build
```

### 5. OAuth Authentication

Run the OAuth setup to authenticate with Google Forms:

```bash
cd packages/gforms-server
pnpm oauth-setup
```

Follow the prompts:
1. Open the provided URL in your browser
2. Sign in with your Google account
3. Grant permissions
4. Copy the authorization code
5. Paste it into the terminal

This creates a `token.json` file with your OAuth tokens.

## Usage

### Local Testing with MCP Inspector

1. **Start the server**:
```bash
cd packages/gforms-server
pnpm start
```

2. **Test with MCP Inspector**:
```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

3. **Try the tools**:
   - Use the Tools tab to test listing forms
   - Use the Resources tab to browse form details
   - Use the Prompts tab to generate surveys

### Claude for Desktop Integration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "gforms": {
      "command": "node",
      "args": [
        "/absolute/path/to/ubiq-mcp-server-dev/packages/gforms-server/dist/index.js"
      ],
      "env": {
        "GOOGLE_CLIENT_ID": "your-client-id",
        "GOOGLE_CLIENT_SECRET": "your-client-secret",
        "TOKEN_PATH": "/absolute/path/to/token.json"
      }
    }
  }
}
```

## Example Use Cases

### List All Forms
```json
{
  "tool": "list_forms",
  "arguments": {
    "pageSize": 20
  }
}
```

### Get Form Details
```json
{
  "tool": "get_form",
  "arguments": {
    "formId": "1BxiMVs0XRA5nFMdLXaWU0c..."
  }
}
```

### Get Form Questions
```json
{
  "tool": "get_form_questions",
  "arguments": {
    "formId": "1BxiMVs0XRA5nFMdLXaWU0c..."
  }
}
```

### List Form Responses
```json
{
  "tool": "list_responses",
  "arguments": {
    "formId": "1BxiMVs0XRA5nFMdLXaWU0c...",
    "pageSize": 50
  }
}
```

### Create a New Form
```json
{
  "tool": "create_form",
  "arguments": {
    "title": "Customer Feedback Survey",
    "description": "Please share your feedback"
  }
}
```

### Add a Question
```json
{
  "tool": "add_question",
  "arguments": {
    "formId": "1BxiMVs0XRA5nFMdLXaWU0c...",
    "title": "How satisfied are you with our service?",
    "questionType": "MULTIPLE_CHOICE",
    "required": true,
    "options": ["Very Satisfied", "Satisfied", "Neutral", "Dissatisfied", "Very Dissatisfied"]
  }
}
```

## Security Notes

- **Never commit** `.env`, `token.json`, or `credentials.json`
- Tokens are stored locally and auto-refresh
- Google Forms API requires OAuth 2.0 (following Google's best practices)
- For production deployment, implement proper secret management

## Troubleshooting

### "Failed to load Google Forms credentials"
- Run `pnpm oauth-setup` to authenticate
- Ensure `token.json` exists and is valid
- Check that `.env` has correct credentials

### "Invalid grant" errors
- Delete `token.json` and re-run `pnpm oauth-setup`
- Check that OAuth redirect URI matches Google Cloud Console

### MCP Inspector connection issues
- Ensure server is built: `pnpm build`
- Check Claude Desktop logs: `~/Library/Logs/Claude/mcp.log`
- Verify absolute paths in configuration

## Next Steps

- **Phase 2**: Deploy to AWS with HTTP transport
- **Phase 3**: Add production OAuth 2.1 flow
- **Advanced**: Add form collaboration, response analytics, form templates

## License

MIT
