import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { Toaster, toast } from 'sonner';
import type { ActivityItem, UserProfile, UserSettings } from '../types';

interface UIContextType {
    // Layout State
    isMobileMenuOpen: boolean;
    setIsMobileMenuOpen: (open: boolean) => void;
    isToolsPanelOpen: boolean;
    setIsToolsPanelOpen: (open: boolean) => void;

    // Dialog State
    showProfileDialog: boolean;
    setShowProfileDialog: (show: boolean) => void;
    showSettingsDialog: boolean;
    setShowSettingsDialog: (show: boolean) => void;

    // Theme & Settings
    settings: UserSettings;
    updateSettings: (settings: UserSettings) => void;
    resolvedTheme: 'light' | 'dark';

    // Profile
    profile: UserProfile;
    updateProfile: (profile: UserProfile) => void;

    // Notifications / Activity
    activities: ActivityItem[];
    addActivity: (type: ActivityItem['type'], action: string, serverId: string, serverName: string) => void;
    markAllNotificationsRead: () => void;
    clearAllData: () => void; // Part of settings dialog usually
    backToLanding: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

const DEFAULT_PROFILE: UserProfile = { name: 'User', email: '' };
const DEFAULT_SETTINGS: UserSettings = {
    theme: 'system', // Default to system to match App.tsx or 'dark' as per design doc? App.tsx used 'light'. Let's stick to 'system' or 'dark' as default for new design. Design doc said 'Obsidian' so 'dark'.
    notifications: true,
    soundEnabled: true,
    compactMode: false,
};

function loadJson<T>(key: string, fallback: T): T {
    try {
        const stored = localStorage.getItem(key);
        return stored ? (JSON.parse(stored) as T) : fallback;
    } catch {
        return fallback;
    }
}

const generateId = (): string => Date.now().toString(36) + Math.random().toString(36).slice(2);

export function UIProvider({ children }: { children: ReactNode }) {
    // --- State ---
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isToolsPanelOpen, setIsToolsPanelOpen] = useState(false);
    const [showProfileDialog, setShowProfileDialog] = useState(false);
    const [showSettingsDialog, setShowSettingsDialog] = useState(false);

    // Persisted State
    const [profile, setProfile] = useState<UserProfile>(() => loadJson('neurix_profile', DEFAULT_PROFILE));
    const [settings, setSettings] = useState<UserSettings>(() => loadJson('neurix_settings', DEFAULT_SETTINGS));
    const [activities, setActivities] = useState<ActivityItem[]>(() => loadJson('neurix_activities', []));

    // --- Effects ---

    // Persistence
    useEffect(() => { localStorage.setItem('neurix_profile', JSON.stringify(profile)); }, [profile]);
    useEffect(() => { localStorage.setItem('neurix_settings', JSON.stringify(settings)); }, [settings]);
    useEffect(() => { localStorage.setItem('neurix_activities', JSON.stringify(activities)); }, [activities]);

    // Theme Resolution
    const resolvedTheme: 'light' | 'dark' =
        settings.theme === 'system'
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : (settings.theme === 'dark' || settings.theme === 'light') ? settings.theme : 'dark';

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(resolvedTheme);
        localStorage.setItem('theme', resolvedTheme);
    }, [resolvedTheme]);

    // Responsive Tools Panel
    useEffect(() => {
        if (window.innerWidth >= 1280) {
            setIsToolsPanelOpen(true);
        }
    }, []);

    // --- Actions ---

    const updateProfile = (newProfile: UserProfile) => {
        setProfile(newProfile);
        toast.success('Profile updated');
    };

    const updateSettings = (newSettings: UserSettings) => {
        setSettings(newSettings);
    };

    const addActivity = useCallback((type: ActivityItem['type'], action: string, serverId: string, serverName: string) => {
        const newActivity: ActivityItem = {
            id: generateId(),
            type,
            action,
            server: serverId,
            serverName,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: false,
        };
        setActivities(prev => [newActivity, ...prev].slice(0, 50));
    }, []);

    const markAllNotificationsRead = () => {
        setActivities(prev => prev.map(a => ({ ...a, read: true })));
    };

    const backToLanding = () => {
        localStorage.removeItem('neurix_visited');
        window.location.reload();
    };

    const clearAllData = () => {
        // This needs to also clear sessions and servers, which are in other contexts.
        // We might need a global event event bus or expose this as a callback prop, 
        // OR just clear localStorage here and reload the page?
        // Reloading is the safest way to clear all state across contexts without complex coupling.

        if (!confirm('This will clear all data including chats, connections, and settings. The page will reload. Continue?')) return;

        // Clear LocalStorage
        ['neurix_sessions', 'neurix_activities', 'neurix_profile', 'neurix_settings'].forEach(k => localStorage.removeItem(k));
        // We also need to clear MCP tokens
        // This is a bit tricky if we don't know the server IDs here.
        // But we can iterate over localStorage keys? 
        // Or just let ServerContext handle its own clearing if we could call it.

        // For now, let's clear what we know and maybe reload page?
        // The tokens are 'mcp_token_${id}'.
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('mcp_token_')) {
                localStorage.removeItem(key);
            }
        });

        // Reset state (although reload will do it)
        setProfile(DEFAULT_PROFILE);
        setSettings(DEFAULT_SETTINGS);
        setActivities([]);

        window.location.reload();
    };

    return (
        <UIContext.Provider value={{
            isMobileMenuOpen, setIsMobileMenuOpen,
            isToolsPanelOpen, setIsToolsPanelOpen,
            showProfileDialog, setShowProfileDialog,
            showSettingsDialog, setShowSettingsDialog,
            settings, updateSettings, resolvedTheme,
            profile, updateProfile,
            activities, addActivity, markAllNotificationsRead,
            clearAllData,
            backToLanding
        }}>
            {children}
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
        </UIContext.Provider>
    );
}

export const useUI = () => {
    const context = useContext(UIContext);
    if (context === undefined) {
        throw new Error('useUI must be used within a UIProvider');
    }
    return context;
};
