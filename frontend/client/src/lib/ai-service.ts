import OpenAI from 'openai';
import type { McpTool, McpServer } from '../types';

// Initialize Groq client via OpenAI-compatible SDK
let groqClient: OpenAI | null = null;

function getClient(): OpenAI {
    if (!groqClient) {
        groqClient = new OpenAI({
            apiKey: import.meta.env.VITE_GROQ_API_KEY,
            baseURL: 'https://api.groq.com/openai/v1',
            dangerouslyAllowBrowser: true,
        });
    }
    return groqClient;
}

export function isConfigured(): boolean {
    return !!import.meta.env.VITE_GROQ_API_KEY;
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

/** Parse text-based function calls that Llama sometimes outputs instead of proper tool_calls */
function parseTextFunctionCalls(text: string): { cleanText: string; toolCalls: AIToolCall[] } {
    const toolCalls: AIToolCall[] = [];
    // Match <function=name>{args}</function> pattern
    const regex = /<function=([^>]+)>(.*?)<\/function>/gs;
    let match;
    let callIndex = 0;

    while ((match = regex.exec(text)) !== null) {
        const fullName = match[1].trim();
        const argsStr = match[2].trim();
        const { serverId, toolName } = parsePrefixedToolName(fullName);

        let args: Record<string, any> = {};
        try {
            args = argsStr ? JSON.parse(argsStr) : {};
        } catch {
            args = {};
        }

        toolCalls.push({
            id: `text_call_${callIndex++}`,
            serverId,
            toolName,
            args,
        });
    }

    // Remove the function call tags from the visible text
    const cleanText = text.replace(/<function=[^>]+>.*?<\/function>/gs, '').trim();

    return { cleanText: cleanText || null as any, toolCalls };
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

IMPORTANT RULES:
- When the user asks you to do something, ALWAYS use the provided tools via function calling. Do NOT write function calls as text.
- Only call a tool when you have ALL required parameters. If a required parameter is missing, ask the user for it instead of guessing.
- You can call multiple tools if needed.
- When presenting tool results to the user, format them in a clean, readable way using markdown. Be concise but helpful.
- If no tool matches the user's request, respond conversationally and suggest what tools are available.
- NEVER output raw XML or function tags in your response text.`;

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
        model: 'llama-3.3-70b-versatile',
        messages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? 'auto' : undefined,
        temperature: 0.2,
    });

    const choice = response.choices[0];
    const assistantMessage = choice.message;

    // Parse proper tool_calls from the API response
    const apiToolCalls: AIToolCall[] = (assistantMessage.tool_calls || [])
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

    // Also check if the model embedded function calls in the text (Llama fallback)
    let text = assistantMessage.content;
    let textToolCalls: AIToolCall[] = [];

    if (text && /<function=/.test(text)) {
        const parsed = parseTextFunctionCalls(text);
        text = parsed.cleanText;
        textToolCalls = parsed.toolCalls;
    }

    const allToolCalls = [...apiToolCalls, ...textToolCalls];

    return {
        text: text || null,
        toolCalls: allToolCalls,
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
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.2,
    });

    return response.choices[0].message.content || '';
}

/** Streaming version of chatWithAI — yields text chunks, then returns tool calls at the end */
export async function streamChatWithAI(
    message: string,
    servers: Record<string, McpServer>,
    history: ChatMessage[],
    onTextChunk: (chunk: string) => void,
): Promise<AIResponse> {
    const client = getClient();
    const tools = mcpToolsToOpenAI(servers);

    const messages: ChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history,
        { role: 'user', content: message },
    ];

    const stream = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? 'auto' : undefined,
        temperature: 0.2,
        stream: true,
    });

    let fullText = '';
    const toolCallChunks: Record<number, { id: string; name: string; arguments: string }> = {};

    for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        if (delta.content) {
            fullText += delta.content;
            onTextChunk(delta.content);
        }

        // Accumulate tool calls (they arrive in fragments)
        if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
                const idx = tc.index;
                if (!toolCallChunks[idx]) {
                    toolCallChunks[idx] = { id: '', name: '', arguments: '' };
                }
                if (tc.id) toolCallChunks[idx].id = tc.id;
                if (tc.function?.name) toolCallChunks[idx].name += tc.function.name;
                if (tc.function?.arguments) toolCallChunks[idx].arguments += tc.function.arguments;
            }
        }
    }

    // Parse accumulated tool calls
    const apiToolCalls: AIToolCall[] = Object.values(toolCallChunks).map(tc => {
        const { serverId, toolName } = parsePrefixedToolName(tc.name);
        let args: Record<string, any> = {};
        try { args = JSON.parse(tc.arguments); } catch { args = {}; }
        return { id: tc.id, serverId, toolName, args };
    });

    // Also check for text-embedded function calls (Llama fallback)
    let text: string | null = fullText || null;
    let textToolCalls: AIToolCall[] = [];

    if (text && /<function=/.test(text)) {
        const parsed = parseTextFunctionCalls(text);
        text = parsed.cleanText;
        textToolCalls = parsed.toolCalls;
    }

    return {
        text: text || null,
        toolCalls: [...apiToolCalls, ...textToolCalls],
    };
}

/** Streaming version of getAIFinalResponse — yields text chunks */
export async function streamAIFinalResponse(
    history: ChatMessage[],
    onTextChunk: (chunk: string) => void,
): Promise<string> {
    const client = getClient();

    const messages: ChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history,
    ];

    const stream = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.2,
        stream: true,
    });

    let fullText = '';
    for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
            fullText += delta.content;
            onTextChunk(delta.content);
        }
    }

    return fullText || '';
}
