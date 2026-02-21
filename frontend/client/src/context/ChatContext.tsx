import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import type { ChatSession, Message } from '../types';
import { useServer } from './ServerContext';
import { useUI } from './UIContext';
import { toast } from 'sonner';
import { generateToolsHelpMessage, matchUserInputToTool } from '../lib/mcp-api';

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

function generateSuggestions(serverName: string, responseContent: string): string[] {
    const suggestions: string[] = [];
    const lower = responseContent.toLowerCase();

    if (lower.includes('file') || lower.includes('document')) {
        suggestions.push('List my files');
    }
    if (lower.includes('search') || lower.includes('find')) {
        suggestions.push('Search for recent files');
    }
    if (lower.includes('form') || lower.includes('survey')) {
        suggestions.push('List my forms');
    }
    if (suggestions.length === 0) {
        suggestions.push('Help');
        if (serverName) suggestions.push(`What can ${serverName} do?`);
    }

    return suggestions.slice(0, 3);
}

export function ChatProvider({ children }: { children: ReactNode }) {
    const { activeServerId, servers, setActiveServerId: setServerActiveId, executeTool, findTool, fetchServerTools } = useServer();
    const { addActivity } = useUI();

    // State
    const [sessions, setSessions] = useState<ChatSession[]>(() => loadJson('neurix_sessions', []));
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

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
            } else {
                const lowerText = text.toLowerCase().trim();

                // Check help
                if (lowerText === 'help' || lowerText === '?' || lowerText.includes('what can you do')) {
                    responseContent = generateToolsHelpMessage(server.tools || [], server.name);
                } else if (server.tools && server.tools.length > 0) {
                    // Match tool
                    const { tool, args, missingRequired } = findTool(serverId, text);

                    if (tool) {
                        if (missingRequired.length > 0) {
                            const toolNameReadable = tool.name.replace(/_/g, ' ');
                            const missingList = missingRequired.map(p => `- **${p}**`).join('\n');
                            responseContent = `**${toolNameReadable}** requires the following argument(s):\n\n${missingList}\n\n**Usage:** \`${toolNameReadable} [${missingRequired[0]}]\``;
                        } else {
                            addActivity('info', `Executing ${tool.name}`, serverId, server.name);
                            responseContent = await executeTool(serverId, tool.name, args);
                        }
                    } else {
                        // No tool matched
                        responseContent = `I couldn't find a matching command for: "${text}"\n\n${generateToolsHelpMessage(server.tools, server.name)}`;
                    }
                } else {
                    // No tools yet - fetch them and retry
                    const fetchedTools = await fetchServerTools(serverId);
                    if (fetchedTools && fetchedTools.length > 0) {
                        // Re-try matching with freshly fetched tools
                        const matched = matchUserInputToTool(text, fetchedTools);
                        if (matched.tool) {
                            if (matched.missingRequired.length > 0) {
                                const toolNameReadable = matched.tool.name.replace(/_/g, ' ');
                                const missingList = matched.missingRequired.map(p => `- **${p}**`).join('\n');
                                responseContent = `**${toolNameReadable}** requires the following argument(s):\n\n${missingList}\n\n**Usage:** \`${toolNameReadable} [${matched.missingRequired[0]}]\``;
                            } else {
                                addActivity('info', `Executing ${matched.tool.name}`, serverId, server.name);
                                responseContent = await executeTool(serverId, matched.tool.name, matched.args);
                            }
                        } else {
                            responseContent = generateToolsHelpMessage(fetchedTools, server.name);
                        }
                    } else {
                        responseContent = `Connecting to ${server.name}... Tools are still loading. Please try again in a moment.`;
                    }
                }
            }

            const suggestions = generateSuggestions(server.name, responseContent);

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
