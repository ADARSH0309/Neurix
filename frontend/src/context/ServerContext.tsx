import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { McpServer, McpTool } from '../types';
import { listTools, callToolAndGetText, matchUserInputToTool, generateToolsHelpMessage } from '../lib/mcp-api';
import { toast } from 'sonner';
import { useUI } from './UIContext'; // Using UI context for notifications/activities

interface ServerContextType {
    servers: Record<string, McpServer>;
    activeServerId: string | null;
    setActiveServerId: (id: string | null) => void;
    connectingServerId: string | null;

    // Actions
    connectServer: (serverId: string) => void;
    disconnectServer: (serverId: string) => void;
    fetchServerTools: (serverId: string) => Promise<McpTool[]>;

    // Tools
    executeTool: (serverId: string, toolName: string, args: Record<string, any>) => Promise<string>;
    findTool: (serverId: string, query: string) => { tool: McpTool | null, args: any, missingRequired: string[] };
}

const ServerContext = createContext<ServerContextType | undefined>(undefined);

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:8080';

function buildDefaultServers(): Record<string, McpServer> {
    return {
        gdrive: { id: 'gdrive', name: 'Google Drive', description: 'Access and manage your Drive files', baseUrl: GATEWAY_URL, connected: false, status: 'available' },
        gforms: { id: 'gforms', name: 'Google Forms', description: 'Create and manage forms & surveys', baseUrl: GATEWAY_URL, connected: false, status: 'available' },
        gmail: { id: 'gmail', name: 'Gmail', description: 'Read and send emails', baseUrl: GATEWAY_URL, connected: false, status: 'available' },
        gcalendar: { id: 'gcalendar', name: 'Google Calendar', description: 'Manage calendars, events & scheduling', baseUrl: GATEWAY_URL, connected: false, status: 'available' },
        gtask: { id: 'gtask', name: 'Google Tasks', description: 'Manage task lists & to-dos', baseUrl: GATEWAY_URL, connected: false, status: 'available' },
        gsheets: { id: 'gsheets', name: 'Google Sheets', description: 'Read, write & manage spreadsheets', baseUrl: GATEWAY_URL, connected: false, status: 'available' },
    };
}

export function ServerProvider({ children }: { children: ReactNode }) {
    const { addActivity } = useUI();
    const [servers, setServers] = useState<Record<string, McpServer>>(buildDefaultServers);
    const [activeServerId, setActiveServerId] = useState<string | null>(null);
    const [connectingServerId, setConnectingServerId] = useState<string | null>(null);

    // --- Helpers ---
    const fetchToolsInternal = async (serverId: string, baseUrl: string, token: string): Promise<McpTool[]> => {
        try {
            const result = await listTools(baseUrl, token);
            if (result.tools) {
                setServers(prev => ({
                    ...prev,
                    [serverId]: { ...prev[serverId], tools: result.tools }
                }));
                return result.tools as McpTool[];
            }
        } catch (error: unknown) {
            console.error(`Failed to fetch tools for ${serverId}:`, error);
            if (error instanceof Error && error.message.includes('401')) {
                toast.error(`Session expired for ${servers[serverId]?.name || serverId}. Please reconnect.`);
                disconnectServer(serverId);
            }
        }
        return [];
    };

    // --- Effects ---

    // Initialize connections on mount (runs once)
    useEffect(() => {
        const newServers = buildDefaultServers();
        let hasConnected = false;
        let firstConnectedId: string | null = null;

        Object.keys(newServers).forEach(id => {
            if (newServers[id].status !== 'available') return;
            const token = localStorage.getItem(`mcp_token_${id}`);
            if (token) {
                newServers[id].connected = true;
                newServers[id].token = token;
                hasConnected = true;
                if (!firstConnectedId) firstConnectedId = id;
            }
        });

        if (hasConnected) {
            setServers(newServers);
            if (firstConnectedId) setActiveServerId(firstConnectedId);

            // Fetch tools for all connected servers
            Object.keys(newServers).forEach(id => {
                const server = newServers[id];
                if (server.connected && server.token) {
                    fetchToolsInternal(id, server.baseUrl, server.token);
                }
            });
        }

        // Handle OAuth callback
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('access_token');
        const serverParam = urlParams.get('server');

        if (token) {
            const pendingId = localStorage.getItem('mcp_auth_pending') || serverParam;
            if (pendingId && newServers[pendingId]) {
                localStorage.setItem(`mcp_token_${pendingId}`, token);
                newServers[pendingId].connected = true;
                newServers[pendingId].token = token;
                setServers({ ...newServers }); // Force update
                setActiveServerId(pendingId);

                addActivity('connect', `Connected to ${newServers[pendingId].name}`, pendingId, newServers[pendingId].name);
                toast.success(`Connected to ${newServers[pendingId].name}`);

                localStorage.removeItem('mcp_auth_pending');
                window.history.replaceState({}, document.title, window.location.pathname);

                fetchToolsInternal(pendingId, newServers[pendingId].baseUrl, token);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Mount only - addActivity is stable via useCallback

    // --- Actions ---

    const connectServer = (serverId: string) => {
        const server = servers[serverId];
        if (!server) return;
        if (server.status === 'coming_soon') {
            toast.info(`${server.name} integration coming soon!`);
            return;
        }
        setConnectingServerId(serverId);
        localStorage.setItem('mcp_auth_pending', serverId);
        const redirectUrl = window.location.origin;
        window.location.href = `${server.baseUrl}/auth/login?redirect_uri=${encodeURIComponent(redirectUrl)}`;
    };

    const disconnectServer = (serverId: string) => {
        localStorage.removeItem(`mcp_token_${serverId}`);
        setServers(prev => ({
            ...prev,
            [serverId]: { ...prev[serverId], connected: false, token: null }
        }));
        if (activeServerId === serverId) {
            const otherConnected = Object.values(servers).find(s => s.id !== serverId && s.connected);
            setActiveServerId(otherConnected?.id || null);
        }
        const serverName = servers[serverId]?.name || serverId;
        addActivity('disconnect', `Disconnected from ${serverName}`, serverId, serverName);
        toast.success(`Disconnected from ${serverName}`);
    };

    const fetchServerTools = async (serverId: string): Promise<McpTool[]> => {
        const server = servers[serverId];
        if (server && server.token) {
            return await fetchToolsInternal(serverId, server.baseUrl, server.token);
        }
        return [];
    };

    const executeTool = async (serverId: string, toolName: string, args: Record<string, any>): Promise<string> => {
        const server = servers[serverId];
        if (!server || !server.token) {
            throw new Error('Server not connected');
        }
        try {
            return await callToolAndGetText(server.baseUrl, server.token, toolName, args);
        } catch (error: unknown) {
            if (error instanceof Error && error.message.includes('401')) {
                toast.error(`Session expired for ${server.name}. Please reconnect.`);
                disconnectServer(serverId);
                throw new Error('Session expired. Please reconnect.');
            }
            throw error;
        }
    };

    const findTool = (serverId: string, query: string) => {
        const server = servers[serverId];
        if (!server || !server.tools) {
            return { tool: null, args: {}, missingRequired: [] };
        }
        return matchUserInputToTool(query, server.tools);
    };

    return (
        <ServerContext.Provider value={{
            servers,
            activeServerId,
            setActiveServerId,
            connectingServerId,
            connectServer,
            disconnectServer,
            fetchServerTools,
            executeTool,
            findTool
        }}>
            {children}
        </ServerContext.Provider>
    );
}

export const useServer = () => {
    const context = useContext(ServerContext);
    if (context === undefined) {
        throw new Error('useServer must be used within a ServerProvider');
    }
    return context;
};
