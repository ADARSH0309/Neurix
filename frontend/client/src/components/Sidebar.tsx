import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
    Search,
    MessageSquare,
    Plus,
    Settings,
    Trash2,
    Clock,
    X,
    MoreHorizontal,
} from 'lucide-react';
import type { McpServer, ChatSession } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { getServerIcon } from '@/lib/server-utils';

interface SidebarProps {
    servers: Record<string, McpServer>;
    activeServerId: string | null;
    onSelectServer: (serverId: string) => void;
    sessions: ChatSession[];
    activeSessionId: string | null;
    onSelectSession: (sessionId: string) => void;
    onNewChat: () => void;
    onDeleteSession: (sessionId: string) => void;
    onClearAll: () => void;
    isMobileOpen: boolean;
    onClose?: () => void;
    onOpenSettings: () => void;
    onConnect: (serverId: string) => void;
    onDisconnect: (serverId: string) => void;
    connectingServerId: string | null;
}

function formatTimeAgo(isoString: string): string {
    const now = Date.now();
    const then = new Date(isoString).getTime();
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
}

export function Sidebar({
    servers,
    sessions,
    activeSessionId,
    onSelectSession,
    onNewChat,
    onDeleteSession,
    onClearAll,
    isMobileOpen,
    onClose,
    onOpenSettings,
}: SidebarProps): React.ReactElement {
    const [searchQuery, setSearchQuery] = useState('');
    const [hoveredSession, setHoveredSession] = useState<string | null>(null);

    // Mock favorites for the visual identity
    const favorites = [
        { id: 'fav1', title: 'System Architecture', type: 'doc' },
        { id: 'fav2', title: 'Auth Middleware', type: 'code' },
    ];

    const filterSessionsByDate = (dateFilter: 'today' | 'yesterday' | 'older') => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const yesterday = today - 86400000;

        return sessions.filter(s => {
            const sessionDate = new Date(s.updatedAt).getTime();
            if (dateFilter === 'today') return sessionDate >= today;
            if (dateFilter === 'yesterday') return sessionDate >= yesterday && sessionDate < today;
            return sessionDate < yesterday;
        });
    };

    const todaySessions = filterSessionsByDate('today');
    const yesterdaySessions = filterSessionsByDate('yesterday');

    return (
        <>
            <AnimatePresence>
                {isMobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-40 md:hidden"
                        onClick={onClose}
                    />
                )}
            </AnimatePresence>

            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 flex flex-col w-[280px] bg-midnight border-r border-[#1F2937]",
                    "md:static md:z-auto",
                    isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
                    "transition-transform duration-200"
                )}
            >
                {/* Header / New Chat */}
                <div className="p-4 border-b border-[#1F2937]/50">
                    <button
                        onClick={onNewChat}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#1F2937] transition-all group items-center justify-start text-sm font-medium text-slate-grey hover:text-white"
                    >
                        <div className="w-6 h-6 rounded flex items-center justify-center border border-[#1F2937] group-hover:border-electric-purple/50">
                            <Plus className="w-4 h-4" />
                        </div>
                        <span>New Conversation</span>
                    </button>
                </div>

                <ScrollArea className="flex-1 px-3 py-4">
                    <div className="space-y-6">
                        {/* FAVORITES */}
                        <div className="space-y-1">
                            <h3 className="text-[11px] font-bold text-slate-grey/50 uppercase tracking-widest px-3 mb-2 font-sans">
                                Favorites
                            </h3>
                            {favorites.map(fav => (
                                <button
                                    key={fav.id}
                                    className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm text-slate-grey hover:text-white hover:bg-[#1F2937] transition-colors group relative"
                                >
                                    <div className="text-mint-green">★</div>
                                    <span className="truncate">{fav.title}</span>
                                </button>
                            ))}
                        </div>

                        {/* PROJECT: ALPHA */}
                        <div className="space-y-1">
                            <h3 className="text-[11px] font-bold text-slate-grey/50 uppercase tracking-widest px-3 mb-2 font-sans">
                                Project: Alpha
                            </h3>
                            <button className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm text-slate-grey hover:text-white hover:bg-[#1F2937] transition-colors">
                                <div className="w-4 h-4 border border-slate-grey/40 rounded-sm" />
                                <span>Sprint Planning</span>
                            </button>
                            <button className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm text-slate-grey hover:text-white hover:bg-[#1F2937] transition-colors">
                                <div className="w-4 h-4 border border-slate-grey/40 rounded-sm" />
                                <span>Mockups v2</span>
                            </button>
                        </div>

                        {/* HISTORY: TODAY */}
                        {todaySessions.length > 0 && (
                            <div className="space-y-1">
                                <h3 className="text-[11px] font-bold text-slate-grey/50 uppercase tracking-widest px-3 mb-2 font-sans">
                                    Today
                                </h3>
                                {todaySessions.map(session => (
                                    <button
                                        key={session.id}
                                        onClick={() => onSelectSession(session.id)}
                                        onMouseEnter={() => setHoveredSession(session.id)}
                                        onMouseLeave={() => setHoveredSession(null)}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-colors relative group",
                                            activeSessionId === session.id
                                                ? "bg-[#1F2937] text-white"
                                                : "text-slate-grey hover:text-white hover:bg-[#1F2937]"
                                        )}
                                    >
                                        {activeSessionId === session.id && (
                                            <motion.div
                                                layoutId="active-cursor"
                                                className="absolute left-0 w-0.5 h-4 bg-electric-purple rounded-full"
                                            />
                                        )}
                                        <MessageSquare className="w-4 h-4 opacity-70" />
                                        <span className="truncate flex-1 text-left">{session.title}</span>
                                        {hoveredSession === session.id && (
                                            <div
                                                onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
                                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                                            >
                                                <MoreHorizontal className="w-3 h-3" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* HISTORY: YESTERDAY */}
                        {yesterdaySessions.length > 0 && (
                            <div className="space-y-1">
                                <h3 className="text-[11px] font-bold text-slate-grey/50 uppercase tracking-widest px-3 mb-2 font-sans">
                                    Yesterday
                                </h3>
                                {yesterdaySessions.map(session => (
                                    <button
                                        key={session.id}
                                        onClick={() => onSelectSession(session.id)}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-colors relative group",
                                            activeSessionId === session.id
                                                ? "bg-[#1F2937] text-white"
                                                : "text-slate-grey hover:text-white hover:bg-[#1F2937]"
                                        )}
                                    >
                                        {activeSessionId === session.id && (
                                            <div className="absolute left-0 w-0.5 h-4 bg-electric-purple rounded-full" />
                                        )}
                                        <MessageSquare className="w-4 h-4 opacity-70" />
                                        <span className="truncate text-left">{session.title}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Footer User Profile */}
                <div className="p-3 border-t border-[#1F2937]/50">
                    <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#1F2937] transition-all group">
                        <div className="w-8 h-8 rounded bg-gradient-to-br from-electric-purple to-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                            A
                        </div>
                        <div className="flex flex-col items-start">
                            <span className="text-xs font-medium text-white">Adarsh Kumar</span>
                            <span className="text-[10px] text-slate-grey">Pro Plan</span>
                        </div>
                    </button>
                </div>
            </aside>
        </>
    );
}
