import { createContext, useContext, useState, useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { ChatSession, Message } from '../types';
import { useServer } from './ServerContext';
import { useUI } from './UIContext';
import { toast } from 'sonner';
import { generateToolsHelpMessage, matchUserInputToTool } from '../lib/mcp-api';
import { isConfigured as isAIConfigured, streamChatWithAI, streamAIFinalResponse } from '../lib/ai-service';
import type OpenAI from 'openai';

interface ChatContextType {
    sessions: ChatSession[];
    activeSessionId: string | null;
    setActiveSessionId: (id: string | null) => void;
    currentSession: ChatSession | undefined;

    // Actions
    createSession: () => string;
    deleteSession: (id: string) => void;
    clearAllSessions: () => void;
    renameSession: (id: string, newTitle: string) => void;
    pinSession: (id: string) => void;
    unpinSession: (id: string) => void;
    sendMessage: (text: string, targetSessionId?: string) => Promise<void>;
    isLoading: boolean;
    streamingContent: string | null;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const generateId = (): string => Date.now().toString(36) + Math.random().toString(36).slice(2);

function loadJson<T>(key: string, fallback: T): T {
    try {
        const stored = localStorage.getItem(key);
        return stored ? (JSON.parse(stored) as T) : fallback;
    } catch {
        return fallback;
    }
}

function generateSuggestions(serverName: string, responseContent: string, serverId?: string): string[] {
    const suggestions: string[] = [];
    const lower = responseContent.toLowerCase();

    // Server-specific contextual suggestions
    if (serverId === 'gdrive') {
        if (lower.includes('file') || lower.includes('document') || lower.includes('folder')) {
            suggestions.push('Search for documents');
            if (lower.includes('list')) suggestions.push('Show shared files');
            else suggestions.push('List my recent files');
        }
        if (lower.includes('created') || lower.includes('uploaded')) {
            suggestions.push('List my recent files');
        }
        if (lower.includes('search')) suggestions.push('Create a new folder');
    } else if (serverId === 'gmail') {
        if (lower.includes('email') || lower.includes('message') || lower.includes('inbox')) {
            suggestions.push('Show unread emails');
            if (lower.includes('list')) suggestions.push('Search my inbox');
            else suggestions.push('List recent messages');
        }
        if (lower.includes('sent') || lower.includes('draft')) {
            suggestions.push('List recent messages');
        }
        if (lower.includes('search')) suggestions.push('Show unread emails');
    } else if (serverId === 'gforms') {
        if (lower.includes('form') || lower.includes('survey') || lower.includes('response')) {
            suggestions.push('Show form responses');
            if (lower.includes('list')) suggestions.push('Search forms');
            else suggestions.push('List my forms');
        }
        if (lower.includes('created')) suggestions.push('List my forms');
    } else if (serverId === 'gcalendar') {
        if (lower.includes('event') || lower.includes('meeting') || lower.includes('schedule')) {
            suggestions.push('List upcoming meetings');
            if (lower.includes('today')) suggestions.push('Check my schedule');
            else suggestions.push('Show today\'s events');
        }
        if (lower.includes('calendar')) suggestions.push('Show today\'s events');
    } else if (serverId === 'gtask') {
        if (lower.includes('task') || lower.includes('todo') || lower.includes('list')) {
            suggestions.push('Show my tasks');
            if (lower.includes('completed')) suggestions.push('Clear completed tasks');
            else suggestions.push('List task lists');
        }
        if (lower.includes('created') || lower.includes('added')) {
            suggestions.push('Show my tasks');
        }
        if (lower.includes('complete')) suggestions.push('List task lists');
    } else if (serverId === 'gsheets') {
        if (lower.includes('spreadsheet') || lower.includes('sheet') || lower.includes('cell')) {
            suggestions.push('List my spreadsheets');
            if (lower.includes('read') || lower.includes('values')) suggestions.push('Read a range');
            else suggestions.push('Read a sheet');
        }
        if (lower.includes('created') || lower.includes('written') || lower.includes('updated')) {
            suggestions.push('List my spreadsheets');
        }
        if (lower.includes('format')) suggestions.push('Read a sheet');
    }

    // General content-based fallbacks
    if (suggestions.length === 0) {
        if (lower.includes('file') || lower.includes('document')) suggestions.push('List my files');
        if (lower.includes('search') || lower.includes('find')) suggestions.push('Search for recent files');
        if (lower.includes('form') || lower.includes('survey')) suggestions.push('List my forms');
        if (lower.includes('email') || lower.includes('message')) suggestions.push('Show unread emails');
        if (lower.includes('event') || lower.includes('meeting')) suggestions.push('Show today\'s events');
        if (lower.includes('task') || lower.includes('todo')) suggestions.push('Show my tasks');
    }

    // Final fallback
    if (suggestions.length === 0) {
        suggestions.push('Help');
        if (serverName) suggestions.push(`What can ${serverName} do?`);
    }

    // Deduplicate and limit
    return [...new Set(suggestions)].slice(0, 3);
}

type ChatMessage = OpenAI.Chat.ChatCompletionMessageParam;

export function ChatProvider({ children }: { children: ReactNode }) {
    const { activeServerId, servers, setActiveServerId: setServerActiveId, executeTool, findTool, fetchServerTools } = useServer();
    const { addActivity } = useUI();

    // State
    const [sessions, setSessions] = useState<ChatSession[]>(() => loadJson('neurix_sessions', []));
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [streamingContent, setStreamingContent] = useState<string | null>(null);

    // OpenAI conversation history per session (not persisted — resets on refresh)
    const aiHistoryRef = useRef<Record<string, ChatMessage[]>>({});

    // Persistence
    useEffect(() => { localStorage.setItem('neurix_sessions', JSON.stringify(sessions)); }, [sessions]);

    // Sorted sessions: pinned first, then by updatedAt
    const sortedSessions = useMemo(() => {
        return [...sessions].sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
    }, [sessions]);

    // Helpers
    const currentSession = sessions.find(s => s.id === activeSessionId);

    // Actions
    const createSession = (): string => {
        const id = generateId();
        const newSession: ChatSession = {
            id,
            title: 'New Chat',
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(id);

        if (!activeServerId) {
            const connectedServer = Object.values(servers).find(s => s.connected);
            if (connectedServer) setServerActiveId(connectedServer.id);
        }

        return id;
    };

    const deleteSession = (sessionId: string) => {
        setSessions(prev => {
            const remaining = prev.filter(s => s.id !== sessionId);
            if (activeSessionId === sessionId) {
                setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
            }
            return remaining;
        });
        toast.success('Chat deleted');
    };

    const clearAllSessions = () => {
        setSessions([]);
        setActiveSessionId(null);
        toast.success('All chats cleared');
    };

    const renameSession = (sessionId: string, newTitle: string) => {
        if (!newTitle.trim()) return;
        setSessions(prev => prev.map(s => {
            if (s.id !== sessionId) return s;
            return { ...s, title: newTitle.trim(), updatedAt: new Date().toISOString() };
        }));
    };

    const pinSession = (id: string) => {
        setSessions(prev => prev.map(s => s.id === id ? { ...s, pinned: true } : s));
    };

    const unpinSession = (id: string) => {
        setSessions(prev => prev.map(s => s.id === id ? { ...s, pinned: false } : s));
    };

    // --- AI-powered sendMessage ---
    const sendMessageWithAI = async (text: string, sessionId: string) => {
        const history = aiHistoryRef.current[sessionId] || [];

        // Call OpenAI with all connected server tools
        const aiResponse = await chatWithAI(text, servers, history);

        // Track conversation: add user message
        history.push({ role: 'user', content: text });

        if (aiResponse.toolCalls.length === 0) {
            // No tool calls — just a text response
            const responseText = aiResponse.text || 'I\'m not sure how to help with that. Try connecting to a service first.';
            history.push({ role: 'assistant', content: responseText });
            aiHistoryRef.current[sessionId] = history;
            return responseText;
        }

        // Build the assistant message with tool_calls for conversation history
        history.push({
            role: 'assistant',
            content: aiResponse.text || null,
            tool_calls: aiResponse.toolCalls.map(tc => ({
                id: tc.id,
                type: 'function' as const,
                function: {
                    name: `${tc.serverId}__${tc.toolName}`,
                    arguments: JSON.stringify(tc.args),
                },
            })),
        } as ChatMessage);

        // Execute each tool call and collect results
        const toolResults: string[] = [];
        let hasError = false;
        for (const tc of aiResponse.toolCalls) {
            const server = servers[tc.serverId];
            if (!server || !server.connected) {
                const errMsg = `Server "${tc.serverId}" is not connected.`;
                toolResults.push(errMsg);
                history.push({ role: 'tool', tool_call_id: tc.id, content: errMsg } as ChatMessage);
                hasError = true;
                continue;
            }
            try {
                addActivity('info', `Executing ${tc.toolName}`, tc.serverId, server.name);
                const result = await executeTool(tc.serverId, tc.toolName, tc.args);
                // Truncate very large results to avoid blowing up the context
                const truncated = result.length > 4000 ? result.slice(0, 4000) + '\n...(truncated)' : result;
                toolResults.push(truncated);
                history.push({ role: 'tool', tool_call_id: tc.id, content: truncated } as ChatMessage);
            } catch (err: unknown) {
                const errMsg = err instanceof Error ? err.message : String(err);
                toolResults.push(`Error: ${errMsg}`);
                history.push({ role: 'tool', tool_call_id: tc.id, content: `Error: ${errMsg}` } as ChatMessage);
                hasError = true;
            }
        }

        // Use the formatted tool result directly (preserves structured formatting from formatToolResponse).
        // Only call AI for summarization when there are multiple tool calls or errors.
        let finalResponse: string;
        if (toolResults.length === 1 && !hasError) {
            // Single successful tool call — use the pre-formatted result directly
            finalResponse = toolResults[0];
            history.push({ role: 'assistant', content: finalResponse });
        } else {
            // Multiple tools or errors — let AI summarize
            finalResponse = await getAIFinalResponse(history);
            history.push({ role: 'assistant', content: finalResponse });
        }

        aiHistoryRef.current[sessionId] = history;
        return finalResponse;
    };

    // --- Keyword-matching fallback sendMessage (original logic) ---
    const sendMessageWithKeywords = async (text: string, serverId: string) => {
        const server = servers[serverId];
        const lowerText = text.toLowerCase().trim();

        // Check help
        if (lowerText === 'help' || lowerText === '?' || lowerText.includes('what can you do')) {
            return generateToolsHelpMessage(server.tools || [], server.name);
        }

        if (server.tools && server.tools.length > 0) {
            const { tool, args, missingRequired } = findTool(serverId, text);
            if (tool) {
                if (missingRequired.length > 0) {
                    const toolNameReadable = tool.name.replace(/_/g, ' ');
                    const missingList = missingRequired.map(p => `- **${p}**`).join('\n');
                    return `**${toolNameReadable}** requires the following argument(s):\n\n${missingList}\n\n**Usage:** \`${toolNameReadable} [${missingRequired[0]}]\``;
                }
                addActivity('info', `Executing ${tool.name}`, serverId, server.name);
                return await executeTool(serverId, tool.name, args);
            }

            // Check other connected servers
            for (const [sid, srv] of Object.entries(servers)) {
                if (sid === serverId || !srv.connected || !srv.tools || srv.tools.length === 0) continue;
                const result = matchUserInputToTool(text, srv.tools);
                if (result.tool && result.missingRequired.length === 0) {
                    setServerActiveId(sid);
                    addActivity('info', `Auto-switched to ${srv.name}`, sid, srv.name);
                    toast.info(`Switched to ${srv.name}`);
                    return await executeTool(sid, result.tool.name, result.args);
                }
            }

            return `I couldn't find a matching command for: "${text}"\n\n${generateToolsHelpMessage(server.tools, server.name)}`;
        }

        // No tools yet — fetch and retry
        const fetchedTools = await fetchServerTools(serverId);
        if (fetchedTools && fetchedTools.length > 0) {
            const matched = matchUserInputToTool(text, fetchedTools);
            if (matched.tool) {
                if (matched.missingRequired.length > 0) {
                    const toolNameReadable = matched.tool.name.replace(/_/g, ' ');
                    const missingList = matched.missingRequired.map(p => `- **${p}**`).join('\n');
                    return `**${toolNameReadable}** requires the following argument(s):\n\n${missingList}\n\n**Usage:** \`${toolNameReadable} [${matched.missingRequired[0]}]\``;
                }
                addActivity('info', `Executing ${matched.tool.name}`, serverId, server.name);
                return await executeTool(serverId, matched.tool.name, matched.args);
            }

            // Check other connected servers
            for (const [sid, srv] of Object.entries(servers)) {
                if (sid === serverId || !srv.connected || !srv.tools || srv.tools.length === 0) continue;
                const result = matchUserInputToTool(text, srv.tools);
                if (result.tool && result.missingRequired.length === 0) {
                    setServerActiveId(sid);
                    toast.info(`Switched to ${srv.name}`);
                    return await executeTool(sid, result.tool.name, result.args);
                }
            }

            return generateToolsHelpMessage(fetchedTools, server.name);
        }

        return `Connecting to ${server.name}... Tools are still loading. Please try again in a moment.`;
    };

    const sendMessage = async (text: string, targetSessionId?: string) => {
        let sessionId = targetSessionId || activeSessionId;
        if (!sessionId) {
            sessionId = createSession();
        }

        const serverId = activeServerId || Object.values(servers).find(s => s.connected)?.id;

        if (!serverId) {
            toast.error('Connect to a service first');
            return;
        }

        if (!activeServerId) setServerActiveId(serverId);
        const server = servers[serverId];

        const userMsg: Message = {
            id: generateId(),
            role: 'user',
            content: text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            createdAt: new Date().toISOString(),
        };

        // UI Update (Optimistic)
        setSessions(prev => prev.map(s => {
            if (s.id !== sessionId) return s;
            const isFirst = s.messages.length === 0;
            return {
                ...s,
                title: isFirst ? text.slice(0, 30) + (text.length > 30 ? '...' : '') : s.title,
                messages: [...s.messages, userMsg],
                updatedAt: new Date().toISOString(),
            };
        }));

        setIsLoading(true);

        try {
            let responseContent = '';

            if (!server.token) {
                responseContent = 'Please connect to the server first.';
            } else if (isAIConfigured()) {
                // AI-powered path: OpenAI handles NLU + tool routing
                responseContent = await sendMessageWithAI(text, sessionId);
            } else {
                // Fallback: keyword matching
                responseContent = await sendMessageWithKeywords(text, serverId);
            }

            const suggestions = generateSuggestions(server.name, responseContent, serverId);

            const aiMsg: Message = {
                id: generateId(),
                role: 'assistant',
                content: responseContent,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                createdAt: new Date().toISOString(),
                suggestions,
            };

            setSessions(prev => prev.map(s => {
                if (s.id !== sessionId) return s;
                return { ...s, messages: [...s.messages, aiMsg], updatedAt: new Date().toISOString() };
            }));

        } catch (err: unknown) {
            const error = err instanceof Error ? err : new Error(String(err));
            console.error('Error sending message:', error);

            let errorMessage = 'Failed to process your request. ';
            errorMessage += error.message || 'Please try again.';

            setSessions(prev => prev.map(s => {
                if (s.id !== sessionId) return s;
                return {
                    ...s,
                    messages: [...s.messages, {
                        id: generateId(),
                        role: 'error',
                        content: errorMessage,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        createdAt: new Date().toISOString(),
                    }],
                    updatedAt: new Date().toISOString(),
                };
            }));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ChatContext.Provider value={{
            sessions: sortedSessions,
            activeSessionId,
            setActiveSessionId,
            currentSession,
            createSession,
            deleteSession,
            clearAllSessions,
            renameSession,
            pinSession,
            unpinSession,
            sendMessage,
            isLoading
        }}>
            {children}
        </ChatContext.Provider>
    );
}

export const useChat = () => {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
};
