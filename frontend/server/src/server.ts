import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// MCP Server configurations
interface McpServerConfig {
  name: string;
  port: number;
  baseUrl: string;
}

const MCP_SERVERS: Record<string, McpServerConfig> = {
  gdrive: {
    name: 'Google Drive',
    port: 8080,
    baseUrl: process.env.GDRIVE_SERVER_URL || 'http://localhost:8080'
  },
  gforms: {
    name: 'Google Forms',
    port: 8081,
    baseUrl: process.env.GFORMS_SERVER_URL || 'http://localhost:8081'
  },
  gmail: {
    name: 'Gmail',
    port: 8082,
    baseUrl: process.env.GMAIL_SERVER_URL || 'http://localhost:8082'
  }
};

// Store tools cache per server
const toolsCache: Record<string, any[]> = {};

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());

// Serve static files
// Serve static files from React app
app.use(express.static(path.join(__dirname, '..', '..', 'client', 'dist')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get server configurations
app.get('/api/servers', (req, res) => {
  const servers = Object.entries(MCP_SERVERS).map(([id, config]) => ({
    id,
    name: config.name,
    baseUrl: config.baseUrl
  }));
  res.json(servers);
});

// Fetch tools from MCP server
async function fetchMcpTools(serverId: string, token?: string): Promise<any[]> {
  const server = MCP_SERVERS[serverId];
  if (!server) return [];

  try {
    const response = await fetch(`${server.baseUrl}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': `http://localhost:${PORT}`,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/list',
        params: {}
      })
    });

    const data = await response.json() as { result?: { tools?: any[] } };
    if (data.result?.tools) {
      toolsCache[serverId] = data.result.tools;
      return data.result.tools;
    }
    return [];
  } catch (error) {
    console.error(`Failed to fetch tools from ${serverId}:`, error);
    return [];
  }
}

// Call MCP tool
async function callMcpTool(serverId: string, toolName: string, args: any, token?: string): Promise<any> {
  const server = MCP_SERVERS[serverId];
  if (!server) throw new Error('Server not found');

  const response = await fetch(`${server.baseUrl}/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': `http://localhost:${PORT}`,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    })
  });

  const data = await response.json() as { error?: { message?: string }; result?: any };
  if (data.error) {
    throw new Error(data.error.message || 'MCP tool call failed');
  }
  return data.result;
}

// Convert MCP tools to OpenAI function format
function mcpToolsToOpenAIFunctions(tools: any[]): OpenAI.Chat.ChatCompletionTool[] {
  return tools.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description || '',
      parameters: tool.inputSchema || { type: 'object', properties: {} }
    }
  }));
}

// Auth status proxy endpoint
app.get('/api/auth/status/:serverId', async (req, res) => {
  const { serverId } = req.params;
  const server = MCP_SERVERS[serverId];

  if (!server) {
    res.status(404).json({ error: 'Server not found' });
    return;
  }

  try {
    const response = await fetch(`${server.baseUrl}/auth/status`, {
      headers: {
        'Cookie': req.headers.cookie || ''
      }
    });

    const data = await response.json() as any;
    res.json(data);
  } catch (error) {
    console.error(`Auth status check failed for ${serverId}:`, error);
    res.status(500).json({ authenticated: false, error: 'Failed to check auth status' });
  }
});

// Get tools endpoint
app.get('/api/tools/:serverId', async (req, res) => {
  const { serverId } = req.params;
  const token = req.headers.authorization?.replace('Bearer ', '');

  try {
    const tools = await fetchMcpTools(serverId, token);
    res.json({ tools });
  } catch (error) {
    console.error(`Failed to fetch tools for ${serverId}:`, error);
    res.status(500).json({ error: 'Failed to fetch tools' });
  }
});

// Chat endpoint with OpenAI
app.post('/api/chat', async (req, res) => {
  const { message, serverId, conversationHistory = [] } = req.body;
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!message) {
    res.status(400).json({ error: 'Message is required' });
    return;
  }

  if (!serverId || !MCP_SERVERS[serverId]) {
    res.status(400).json({ error: 'Valid serverId is required' });
    return;
  }

  try {
    // Fetch available tools
    let tools = toolsCache[serverId];
    if (!tools || tools.length === 0) {
      tools = await fetchMcpTools(serverId, token);
    }

    const openaiTools = mcpToolsToOpenAIFunctions(tools);

    // Build messages
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are a helpful assistant that can interact with ${MCP_SERVERS[serverId].name}.
Use the available tools to help the user with their requests.
When calling tools, make sure to provide all required parameters.
Always explain what you're doing and the results you get.`
      },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      tools: openaiTools.length > 0 ? openaiTools : undefined,
      tool_choice: openaiTools.length > 0 ? 'auto' : undefined
    });

    const assistantMessage = response.choices[0].message;

    // Handle tool calls if any - filter for function type tool calls
    const functionToolCalls = assistantMessage.tool_calls?.filter(
      (tc): tc is OpenAI.Chat.ChatCompletionMessageToolCall & { type: 'function' } => tc.type === 'function'
    ) || [];

    if (functionToolCalls.length > 0) {
      const toolResults: any[] = [];

      for (const toolCall of functionToolCalls) {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          const result = await callMcpTool(serverId, toolCall.function.name, args, token);

          let resultText = '';
          if (result.content) {
            resultText = Array.isArray(result.content)
              ? result.content.map((c: any) => c.text || JSON.stringify(c)).join('\n')
              : result.content;
          } else {
            resultText = JSON.stringify(result, null, 2);
          }

          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool' as const,
            content: resultText
          });
        } catch (error) {
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool' as const,
            content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }

      // Get final response after tool calls
      const finalMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        ...messages,
        assistantMessage,
        ...toolResults
      ];

      const finalResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: finalMessages
      });

      res.json({
        response: finalResponse.choices[0].message.content,
        toolCalls: functionToolCalls.map(tc => ({
          name: tc.function.name,
          args: JSON.parse(tc.function.arguments)
        })),
        toolResults: toolResults.map(tr => tr.content)
      });
    } else {
      res.json({
        response: assistantMessage.content
      });
    }
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Chat failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Proxy endpoint for MCP requests
app.post('/api/proxy/:serverId', async (req, res) => {
  const { serverId } = req.params;
  const server = MCP_SERVERS[serverId];

  if (!server) {
    res.status(404).json({ error: 'Server not found' });
    return;
  }

  try {
    const authHeader = req.headers.authorization;
    const targetUrl = new URL('/', server.baseUrl);

    const response = await fetch(targetUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { 'Authorization': authHeader } : {})
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error(`Proxy error for ${serverId}:`, error);
    res.status(500).json({
      error: 'Proxy error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// OAuth callback handler
app.get('/oauth/callback', (req, res) => {
  const { access_token, server } = req.query;

  if (access_token && server) {
    res.redirect(`/?access_token=${access_token}&server=${server}`);
  } else {
    res.status(400).json({ error: 'Missing access_token or server parameter' });
  }
});

// Serve the main page for all other routes (SPA)
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'client', 'dist', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`
  MCP Chat Interface Server started!

  Local:    http://localhost:${PORT}

  MCP Servers:
  - Google Drive: ${MCP_SERVERS.gdrive.baseUrl}
  - Google Forms: ${MCP_SERVERS.gforms.baseUrl}
  - Gmail:        ${MCP_SERVERS.gmail.baseUrl}

  OpenAI: ${process.env.OPENAI_API_KEY ? 'Configured' : 'Not configured'}
  `);
});
