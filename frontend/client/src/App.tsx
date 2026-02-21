import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { Header } from './components/Header';
import { ToolsPanel } from './components/ToolsPanel';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ProfileDialog } from './components/ProfileDialog';
import { SettingsDialog } from './components/SettingsDialog';
import type { McpServer, Message, ChatSession, ActivityItem, UserProfile, UserSettings } from './types';
import { Toaster, toast } from 'sonner';
import {
    listTools,
    callToolAndGetText,
    generateToolsHelpMessage,
    matchUserInputToTool,
} from './lib/mcp-api';

interface AppProps {
    onBackToLanding?: () => void;
}

const generateId = (): string =>
    Date.now().toString(36) + Math.random().toString(36).slice(2);

const DEFAULT_PROFILE: UserProfile = { name: 'User', email: '' };
const DEFAULT_SETTINGS: UserSettings = {
    theme: 'light',
    notifications: true,
    soundEnabled: true,
    compactMode: false,
};

function buildDefaultServers(): Record<string, McpServer> {
    return {
        gdrive: { id: 'gdrive', name: 'Google Drive', description: 'Access and manage your Drive files', baseUrl: 'http://localhost:8080', connected: false, status: 'available' },
        gforms: { id: 'gforms', name: 'Google Forms', description: 'Create and manage forms & surveys', baseUrl: 'http://localhost:8081', connected: false, status: 'available' },
        github: { id: 'github', name: 'GitHub', description: 'Manage repositories and issues', baseUrl: '', connected: false, status: 'coming_soon' },
        slack: { id: 'slack', name: 'Slack', description: 'Team messaging and channels', baseUrl: '', connected: false, status: 'coming_soon' },
        notion: { id: 'notion', name: 'Notion', description: 'Documents, wikis and databases', baseUrl: '', connected: false, status: 'coming_soon' },
        gmail: { id: 'gmail', name: 'Gmail', description: 'Read and send emails', baseUrl: 'http://localhost:8082', connected: false, status: 'available' },
    };
}

function loadJson<T>(key: string, fallback: T): T {
    try {
        const stored = localStorage.getItem(key);
        return stored ? (JSON.parse(stored) as T) : fallback;
    } catch {
        return fallback;
    }
}

function App({ onBackToLanding }: AppProps): React.ReactElement {
    // --- MCP Servers ---
    const [servers, setServers] = useState<Record<string, McpServer>>(buildDefaultServers);
    const [activeServerId, setActiveServerId] = useState<string | null>(null);

    // --- Chat Sessions (persisted) ---
    const [sessions, setSessions] = useState<ChatSession[]>(() => loadJson('neurix_sessions', []));
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

    // --- Activities / Notifications (persisted) ---
    const [activities, setActivities] = useState<ActivityItem[]>(() => loadJson('neurix_activities', []));

    // --- Profile (persisted) ---
    const [profile, setProfile] = useState<UserProfile>(() => loadJson('neurix_profile', DEFAULT_PROFILE));

    // --- Settings (persisted) ---
    const [settings, setSettings] = useState<UserSettings>(() => loadJson('neurix_settings', DEFAULT_SETTINGS));

    // --- UI State ---
    const [isLoading, setIsLoading] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isToolsPanelOpen, setIsToolsPanelOpen] = useState(false);
    const [showProfileDialog, setShowProfileDialog] = useState(false);
    const [showSettingsDialog, setShowSettingsDialog] = useState(false);
    const [connectingServerId, setConnectingServerId] = useState<string | null>(null);

    // --- Resolve theme ---
    const resolvedTheme: 'light' | 'dark' =
        settings.theme === 'system'
            ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : settings.theme;

    // --- Persistence ---
    useEffect(() => { localStorage.setItem('neurix_sessions', JSON.stringify(sessions)); }, [sessions]);
    useEffect(() => { localStorage.setItem('neurix_activities', JSON.stringify(activities)); }, [activities]);
    useEffect(() => { localStorage.setItem('neurix_profile', JSON.stringify(profile)); }, [profile]);
    useEffect(() => { localStorage.setItem('neurix_settings', JSON.stringify(settings)); }, [settings]);

    // --- Theme application ---
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(resolvedTheme);
        localStorage.setItem('theme', resolvedTheme);
    }, [resolvedTheme]);

    // --- Fetch tools for a server ---
    const fetchServerTools = async (serverId: string, baseUrl: string, token: string): Promise<void> => {
        try {
            const result = await listTools(baseUrl, token);
            if (result.tools) {
                setServers(prev => ({
                    ...prev,
                    [serverId]: { ...prev[serverId], tools: result.tools }
                }));
            }
        } catch (error) {
            console.error(`Failed to fetch tools for ${serverId}:`, error);
        }
    };

    // --- Load tokens + auth callback on mount ---
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
                    fetchServerTools(id, server.baseUrl, server.token);
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
                setServers({ ...newServers });
                setActiveServerId(pendingId);
                addActivity('connect', `Connected to ${newServers[pendingId].name}`, pendingId);
                toast.success(`Connected to ${newServers[pendingId].name}`);
                localStorage.removeItem('mcp_auth_pending');
                window.history.replaceState({}, document.title, window.location.pathname);

                // Fetch tools for the newly connected server
                fetchServerTools(pendingId, newServers[pendingId].baseUrl, token);
            }
        }

        // Open tools panel on xl screens
        if (window.innerWidth >= 1280) {
            setIsToolsPanelOpen(true);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- Activity / Notification helpers ---
    const addActivity = (type: ActivityItem['type'], action: string, serverId: string): void => {
        const server = servers[serverId] || { name: serverId };
        const newActivity: ActivityItem = {
            id: generateId(),
            type,
            action,
            server: serverId,
            serverName: server.name,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: false,
        };
        setActivities(prev => [newActivity, ...prev].slice(0, 50));
    };

    const markAllNotificationsRead = (): void => {
        setActivities(prev => prev.map(a => ({ ...a, read: true })));
    };

    // --- Server actions ---
    const connectServer = (serverId: string): void => {
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

    const disconnectServer = (serverId: string): void => {
        localStorage.removeItem(`mcp_token_${serverId}`);
        setServers(prev => ({
            ...prev,
            [serverId]: { ...prev[serverId], connected: false, token: null }
        }));
        if (activeServerId === serverId) {
            const otherConnected = Object.values(servers).find(s => s.id !== serverId && s.connected);
            setActiveServerId(otherConnected?.id || null);
        }
        addActivity('disconnect', `Disconnected from ${servers[serverId]?.name}`, serverId);
        toast.success(`Disconnected from ${servers[serverId]?.name}`);
    };

    // --- Session management ---
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
            if (connectedServer) setActiveServerId(connectedServer.id);
        }

        return id;
    };

    const deleteSession = (sessionId: string): void => {
        setSessions(prev => {
            const remaining = prev.filter(s => s.id !== sessionId);
            if (activeSessionId === sessionId) {
                setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
            }
            return remaining;
        });
        toast.success('Chat deleted');
    };

    const clearAllSessions = (): void => {
        setSessions([]);
        setActiveSessionId(null);
        toast.success('All chats cleared');
    };

    const renameSession = (sessionId: string, newTitle: string): void => {
        if (!newTitle.trim()) return;
        setSessions(prev => prev.map(s => {
            if (s.id !== sessionId) return s;
            return { ...s, title: newTitle.trim(), updatedAt: new Date().toISOString() };
        }));
    };

    // --- Send message ---
    const sendMessage = async (text: string, targetSessionId?: string): Promise<void> => {
        let sessionId = targetSessionId || activeSessionId;
        if (!sessionId) {
            sessionId = createSession();
        }

        const serverId = activeServerId || Object.values(servers).find(s => s.connected)?.id;
        if (!serverId) {
            toast.error('Connect to a service first');
            return;
        }
        if (!activeServerId) setActiveServerId(serverId);

        const server = servers[serverId];
        const userMsg: Message = {
            id: generateId(),
            role: 'user',
            content: text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        // Add user message + auto-title from first message
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
                responseContent = 'Please connect to the server first by clicking the Connect button in the MCP panel.';
            } else {
                const lowerText = text.toLowerCase().trim();

                // Handle help command
                if (lowerText === 'help' || lowerText === '?' || lowerText.includes('what can you do')) {
                    responseContent = generateToolsHelpMessage(server.tools || [], server.name);
                } else if (server.tools && server.tools.length > 0) {
                    // Try to match user input to a tool
                    const { tool, args, missingRequired } = matchUserInputToTool(text, server.tools);

                    if (tool) {
                        if (missingRequired.length > 0) {
                            // Missing required arguments - prompt user
                            const toolNameReadable = tool.name.replace(/_/g, ' ');
                            const missingList = missingRequired.map(p => `- **${p}**`).join('\n');
                            responseContent = `**${toolNameReadable}** requires the following argument(s):\n\n${missingList}\n\n**Usage:** \`${toolNameReadable} [${missingRequired[0]}]\`\n\nExample: \`${toolNameReadable} your-value-here\``;
                        } else {
                            addActivity('info', `Executing ${tool.name.replace(/_/g, ' ')}`, serverId);
                            responseContent = await callToolAndGetText(server.baseUrl, server.token, tool.name, args);
                        }
                    } else {
                        // No tool matched, show help
                        responseContent = `I couldn't find a matching command for: "${text}"\n\n${generateToolsHelpMessage(server.tools, server.name)}`;
                    }
                } else {
                    // No tools available, try to fetch them
                    try {
                        const result = await listTools(server.baseUrl, server.token);
                        if (result.tools && result.tools.length > 0) {
                            setServers(prev => ({
                                ...prev,
                                [serverId]: { ...prev[serverId], tools: result.tools }
                            }));

                            // Try again with the fetched tools
                            const { tool, args, missingRequired } = matchUserInputToTool(text, result.tools);
                            if (tool) {
                                if (missingRequired.length > 0) {
                                    const toolNameReadable = tool.name.replace(/_/g, ' ');
                                    const missingList = missingRequired.map(p => `- **${p}**`).join('\n');
                                    responseContent = `**${toolNameReadable}** requires the following argument(s):\n\n${missingList}\n\n**Usage:** \`${toolNameReadable} [${missingRequired[0]}]\``;
                                } else {
                                    addActivity('info', `Executing ${tool.name.replace(/_/g, ' ')}`, serverId);
                                    responseContent = await callToolAndGetText(server.baseUrl, server.token, tool.name, args);
                                }
                            } else {
                                responseContent = `I couldn't find a matching command for: "${text}"\n\n${generateToolsHelpMessage(result.tools, server.name)}`;
                            }
                        } else {
                            responseContent = `No tools available for ${server.name}. The server might not be properly configured.`;
                        }
                    } catch (toolsError) {
                        responseContent = `Failed to get available commands from ${server.name}. Please try reconnecting.`;
                    }
                }
            }

            const aiMsg: Message = {
                id: generateId(),
                role: 'assistant',
                content: responseContent,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };

            setSessions(prev => prev.map(s => {
                if (s.id !== sessionId) return s;
                return { ...s, messages: [...s.messages, aiMsg], updatedAt: new Date().toISOString() };
            }));
        } catch (err: unknown) {
            const error = err instanceof Error ? err : new Error(String(err));
            console.error('Error sending message:', error);

            let errorMessage = 'Failed to process your request. ';
            if (error.message?.includes('401') || error.message?.includes('authentication') || error.message?.includes('session')) {
                // Auto-disconnect on auth error so user can easily reconnect
                errorMessage += 'Your session has expired. Click "Connect" in the MCP Panel to reconnect.';
                if (serverId) {
                    localStorage.removeItem(`mcp_token_${serverId}`);
                    setServers(prev => ({
                        ...prev,
                        [serverId]: { ...prev[serverId], connected: false, token: null }
                    }));
                    toast.error(`${servers[serverId]?.name} session expired. Please reconnect.`);
                }
            } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
                errorMessage += 'Could not connect to the server. Make sure the backend is running.';
            } else {
                errorMessage += error.message || 'Please try again.';
            }

            setSessions(prev => prev.map(s => {
                if (s.id !== sessionId) return s;
                return {
                    ...s,
                    messages: [...s.messages, {
                        id: generateId(),
                        role: 'error' as const,
                        content: errorMessage,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    }],
                    updatedAt: new Date().toISOString(),
                };
            }));
        } finally {
            setIsLoading(false);
        }
    };

    // --- Profile & Settings ---
    const updateProfile = (newProfile: UserProfile): void => {
        setProfile(newProfile);
        toast.success('Profile updated');
    };

    const updateSettings = (newSettings: UserSettings): void => {
        setSettings(newSettings);
    };

    const clearAllData = (): void => {
        if (!confirm('This will clear all data including chats, connections, and settings. Continue?')) return;

        setSessions([]);
        setActivities([]);
        setProfile(DEFAULT_PROFILE);
        setSettings(DEFAULT_SETTINGS);
        setActiveSessionId(null);
        setActiveServerId(null);
        setShowSettingsDialog(false);

        Object.keys(servers).forEach(id => localStorage.removeItem(`mcp_token_${id}`));
        setServers(buildDefaultServers());

        ['neurix_sessions', 'neurix_activities', 'neurix_profile', 'neurix_settings'].forEach(k => localStorage.removeItem(k));

        toast.success('All data cleared');
    };

    // --- Derived ---
    const connectedCount = Object.values(servers).filter(s => s.connected).length;
    const currentSession = sessions.find(s => s.id === activeSessionId);
    const currentMessages = currentSession?.messages || [];
    const unreadCount = activities.filter(a => !a.read).length;

    return (
        <div className="relative flex flex-col h-screen bg-background text-foreground overflow-hidden font-sans transition-colors duration-300">
            <Header
                profile={profile}
                theme={resolvedTheme}
                onToggleSidebar={() => setIsMobileOpen(!isMobileOpen)}
                isSidebarOpen={isMobileOpen}
                connectedServers={connectedCount}
                activities={activities}
                unreadCount={unreadCount}
                onMarkAllRead={markAllNotificationsRead}
                onOpenProfile={() => setShowProfileDialog(true)}
                onOpenSettings={() => setShowSettingsDialog(true)}
                onBackToLanding={onBackToLanding}
            />

            <div className="relative z-10 flex flex-1 overflow-hidden">
                <Sidebar
                    servers={servers}
                    activeServerId={activeServerId}
                    onSelectServer={(id) => { setActiveServerId(id); setIsMobileOpen(false); }}
                    sessions={sessions}
                    activeSessionId={activeSessionId}
                    onSelectSession={(id) => { setActiveSessionId(id); setIsMobileOpen(false); }}
                    onNewChat={createSession}
                    onDeleteSession={deleteSession}
                    onClearAll={clearAllSessions}
                    isMobileOpen={isMobileOpen}
                    onClose={() => setIsMobileOpen(false)}
                    onOpenSettings={() => setShowSettingsDialog(true)}
                    onConnect={connectServer}
                    onDisconnect={disconnectServer}
                    connectingServerId={connectingServerId}
                />

                <main className="flex-1 flex flex-col overflow-hidden">
                    {!activeSessionId ? (
                        <WelcomeScreen
                            profile={profile}
                            servers={servers}
                            onConnect={connectServer}
                            onQuickAction={(action) => {
                                const id = createSession();
                                sendMessage(action, id);
                            }}
                            onNewChat={createSession}
                        />
                    ) : (
                        <ChatArea
                            activeServer={activeServerId ? servers[activeServerId] : null}
                            servers={servers}
                            activeServerId={activeServerId}
                            onSelectServer={setActiveServerId}
                            messages={currentMessages}
                            onSendMessage={sendMessage}
                            isLoading={isLoading}
                            profile={profile}
                            isToolsPanelOpen={isToolsPanelOpen}
                            onToggleToolsPanel={() => setIsToolsPanelOpen(!isToolsPanelOpen)}
                            compactMode={settings.compactMode}
                            sessionTitle={currentSession?.title || 'New Chat'}
                            sessionId={activeSessionId}
                            onRenameSession={renameSession}
                        />
                    )}
                </main>

                <ToolsPanel
                    isOpen={isToolsPanelOpen}
                    onClose={() => setIsToolsPanelOpen(false)}
                    servers={servers}
                    onConnect={connectServer}
                    onDisconnect={disconnectServer}
                    onToolAction={(action) => {
                        const id = activeSessionId || createSession();
                        sendMessage(action, id);
                    }}
                    activities={activities}
                />
            </div>

            <ProfileDialog
                open={showProfileDialog}
                onOpenChange={setShowProfileDialog}
                profile={profile}
                onSave={updateProfile}
            />
            <SettingsDialog
                open={showSettingsDialog}
                onOpenChange={setShowSettingsDialog}
                settings={settings}
                onSave={updateSettings}
                onClearData={clearAllData}
            />

            <Toaster
                position="top-right"
                theme={resolvedTheme}
                toastOptions={{
                    style: {
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        color: 'hsl(var(--foreground))',
                    },
                }}
            />
        </div>
    );
}

export default App;
