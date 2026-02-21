export interface McpTool {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties?: Record<string, unknown>;
        required?: string[];
    };
}

export interface McpServer {
    id: string;
    name: string;
    description: string;
    baseUrl: string;
    connected: boolean;
    tools?: McpTool[];
    token?: string | null;
    status: 'available' | 'coming_soon';
}

export interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system' | 'error';
    content: string;
    timestamp: string;
}

export interface ChatSession {
    id: string;
    title: string;
    messages: Message[];
    createdAt: string;
    updatedAt: string;
}

export interface ActivityItem {
    id: string;
    type: 'list' | 'search' | 'connect' | 'disconnect' | 'message' | 'info';
    action: string;
    server: string;
    serverName: string;
    time: string;
    read: boolean;
}

export interface UserProfile {
    name: string;
    email: string;
}

export interface UserSettings {
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
    soundEnabled: boolean;
    compactMode: boolean;
}
