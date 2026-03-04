import OpenAI from 'openai';
import type { McpTool, McpServer } from '../types';

// Initialize OpenAI client (browser-side)
let openaiClient: OpenAI | null = null;

function getClient(): OpenAI {
    if (!openaiClient) {
        openaiClient = new OpenAI({
            apiKey: import.meta.env.VITE_OPENAI_API_KEY,
            dangerouslyAllowBrowser: true,
        });
    }
    return openaiClient;
}

export function isConfigured(): boolean {
    return !!import.meta.env.VITE_OPENAI_API_KEY;
}

/** Convert MCP tools from all servers into OpenAI function-calling format, prefixed with serverId */
export function mcpToolsToOpenAI(
    servers: Record<string, McpServer>
): OpenAI.Chat.ChatCompletionTool[] {
    const tools: OpenAI.Chat.ChatCompletionTool[] = [];

    for (const [serverId, server] of Object.entries(servers)) {
        if (!server.connected || !server.tools || server.tools.length === 0) continue;
        for (const tool of server.tools) {
            tools.push({
                type: 'function',
                function: {
                    name: `${serverId}__${tool.name}`,
                    description: `[${server.name}] ${tool.description || ''}`,
                    parameters: tool.inputSchema || { type: 'object', properties: {} },
                },
            });
        }
    }

    return tools;
}

/** Parse a prefixed tool name back into serverId + toolName */
function parsePrefixedToolName(prefixed: string): { serverId: string; toolName: string } {
    const idx = prefixed.indexOf('__');
    if (idx === -1) return { serverId: '', toolName: prefixed };
    return { serverId: prefixed.slice(0, idx), toolName: prefixed.slice(idx + 2) };
}

export interface AIToolCall {
    id: string;
    serverId: string;
    toolName: string;
    args: Record<string, any>;
}

export interface AIResponse {
    text: string | null;
    toolCalls: AIToolCall[];
}

type ChatMessage = OpenAI.Chat.ChatCompletionMessageParam;

const SYSTEM_PROMPT = `You are Neurix, a helpful AI assistant that connects to Google services (Gmail, Drive, Forms, Calendar, Tasks) via MCP servers.

When the user asks you to do something, use the available tools to fulfill their request. You can call multiple tools if needed.

When presenting tool results to the user, format them in a clean, readable way using markdown. Be concise but helpful.

If no tool matches the user's request, respond conversationally and suggest what tools are available.`;

/** Send a user message with available tools, get back text and/or tool calls */
export async function chatWithAI(
    message: string,
    servers: Record<string, McpServer>,
    history: ChatMessage[]
): Promise<AIResponse> {
    const client = getClient();
    const tools = mcpToolsToOpenAI(servers);

    const messages: ChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history,
        { role: 'user', content: message },
    ];

    const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        tools: tools.length > 0 ? tools : undefined,
        temperature: 0.3,
    });

    const choice = response.choices[0];
    const assistantMessage = choice.message;

    const toolCalls: AIToolCall[] = (assistantMessage.tool_calls || [])
        .filter((tc): tc is OpenAI.Chat.ChatCompletionMessageToolCall & { type: 'function' } => tc.type === 'function')
        .map(tc => {
            const { serverId, toolName } = parsePrefixedToolName(tc.function.name);
            let args: Record<string, any> = {};
            try {
                args = JSON.parse(tc.function.arguments);
            } catch {
                args = {};
            }
            return { id: tc.id, serverId, toolName, args };
        });

    return {
        text: assistantMessage.content,
        toolCalls,
    };
}

/** After tool execution, send results back and get a final natural language response */
export async function getAIFinalResponse(
    history: ChatMessage[]
): Promise<string> {
    const client = getClient();

    const messages: ChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history,
    ];

    const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.3,
    });

    return response.choices[0].message.content || '';
}
