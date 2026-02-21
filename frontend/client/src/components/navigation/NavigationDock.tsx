import { useState, useRef } from 'react';
import { useServer } from '../../context/ServerContext';
import { useChat } from '../../context/ChatContext';
import { useUI } from '../../context/UIContext';
import {
    LayoutGrid, MessageSquare, Settings, Plus, Terminal,
    ChevronRight, ChevronLeft, Search, MoreHorizontal, Pin, PinOff,
    Pencil, Trash2, User,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { getServerIcon, getServerVisual } from '../../lib/server-utils';

export function NavigationDock() {
    const { servers, activeServerId, setActiveServerId, connectServer } = useServer();
    const { sessions, activeSessionId, setActiveSessionId, createSession, deleteSession, renameSession, pinSession, unpinSession } = useChat();
    const { setShowSettingsDialog, setIsToolsPanelOpen, isToolsPanelOpen, setShowProfileDialog } = useUI();

    const [isCollapsed, setIsCollapsed] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [contextMenuId, setContextMenuId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const editInputRef = useRef<HTMLInputElement>(null);

    const toggleDock = () => setIsCollapsed(!isCollapsed);

    const filteredSessions = searchQuery.trim()
        ? sessions.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
        : sessions;
    const pinnedSessions = filteredSessions.filter(s => s.pinned);
    const unpinnedSessions = filteredSessions.filter(s => !s.pinned);

    const handleRenameStart = (sessionId: string, currentTitle: string) => {
        setEditingId(sessionId); setEditTitle(currentTitle); setContextMenuId(null);
        setTimeout(() => editInputRef.current?.focus(), 50);
    };
    const handleRenameSubmit = (sessionId: string) => {
        if (editTitle.trim()) renameSession(sessionId, editTitle);
        setEditingId(null);
    };
    const handleTogglePin = (sessionId: string, isPinned?: boolean) => {
        if (isPinned) unpinSession(sessionId); else pinSession(sessionId);
        setContextMenuId(null);
    };
    const handleDelete = (sessionId: string) => { deleteSession(sessionId); setContextMenuId(null); };

    const renderSessionItem = (session: typeof sessions[0]) => {
        const isActive = activeSessionId === session.id;
        const isEditing = editingId === session.id;

        return (
            <div key={session.id} className="group relative">
                {isEditing ? (
                    <div className="flex items-center gap-2 p-2">
                        <MessageSquare size={18} className="shrink-0 text-muted-foreground" />
                        <input
                            ref={editInputRef} value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            onBlur={() => handleRenameSubmit(session.id)}
                            onKeyDown={e => { if (e.key === 'Enter') handleRenameSubmit(session.id); if (e.key === 'Escape') setEditingId(null); }}
                            className="flex-1 bg-muted border border-neurix-orange/30 rounded px-2 py-1 text-sm text-foreground outline-none focus:border-neurix-orange/50 font-mono"
                        />
                    </div>
                ) : (
                    <button
                        onClick={() => setActiveSessionId(session.id)}
                        className={cn(
                            "w-full flex items-center gap-3 p-2 rounded-lg transition-all text-sm",
                            isActive
                                ? "bg-neurix-orange/10 text-foreground border border-neurix-orange/20"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50 dark:hover:bg-white/5 border border-transparent"
                        )}
                    >
                        <MessageSquare size={18} className="shrink-0" />
                        {!isCollapsed && (
                            <>
                                <span className="truncate flex-1 text-left">{session.title}</span>
                                {session.pinned && <Pin size={12} className="shrink-0 text-neurix-orange" />}
                                <button
                                    onClick={(e) => { e.stopPropagation(); setContextMenuId(contextMenuId === session.id ? null : session.id); }}
                                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted"
                                >
                                    <MoreHorizontal size={14} />
                                </button>
                            </>
                        )}
                    </button>
                )}

                <AnimatePresence>
                    {contextMenuId === session.id && !isCollapsed && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }}
                            transition={{ duration: 0.1 }}
                            className="absolute right-0 top-full z-50 w-40 rounded-lg bg-popover border border-border shadow-xl py-1 mt-1"
                        >
                            <button onClick={() => handleRenameStart(session.id, session.title)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                                <Pencil size={12} /> Rename
                            </button>
                            <button onClick={() => handleTogglePin(session.id, session.pinned)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                                {session.pinned ? <PinOff size={12} /> : <Pin size={12} />} {session.pinned ? 'Unpin' : 'Pin'}
                            </button>
                            <button onClick={() => handleDelete(session.id)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/5 transition-colors">
                                <Trash2 size={12} /> Delete
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    return (
        <motion.div
            initial={{ width: 80 }} animate={{ width: isCollapsed ? 80 : 280 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="h-full relative z-20 flex flex-col bg-card/80 backdrop-blur-xl border-r border-border"
        >
            {/* Header */}
            <div className="h-16 flex items-center justify-center border-b border-border relative shrink-0">
                <div className="w-10 h-10 rounded-xl bg-neurix-orange flex items-center justify-center shadow-lg shadow-neurix-orange/20">
                    <LayoutGrid className="text-white w-5 h-5" />
                </div>
                <AnimatePresence>
                    {!isCollapsed && (
                        <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                            className="absolute left-20 font-heading font-bold text-lg tracking-tight text-foreground"
                        >
                            Neurix
                        </motion.span>
                    )}
                </AnimatePresence>
                <button onClick={toggleDock} className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shadow-sm">
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
            </div>

            {/* Search */}
            {!isCollapsed && (
                <div className="px-3 pt-3 pb-1 shrink-0">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <input
                            type="text" placeholder="Search chats..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            className="w-full h-8 pl-8 pr-3 rounded-lg bg-muted/50 dark:bg-white/[0.03] border border-border text-xs font-mono text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-neurix-orange/30 transition-all"
                        />
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar py-4 space-y-6">
                {/* Servers */}
                <div className="px-3">
                    {!isCollapsed && <h3 className="text-[10px] font-mono font-bold text-muted-foreground mb-3 px-2 uppercase tracking-widest">Systems</h3>}
                    <div className="space-y-1.5">
                        {Object.values(servers).map(server => {
                            const ServerIcon = getServerIcon(server.id);
                            const visual = getServerVisual(server.id);
                            const isActive = activeServerId === server.id && server.connected;

                            return (
                                <div key={server.id} className="group relative">
                                    <button
                                        onClick={() => { if (server.connected) setActiveServerId(server.id); else connectServer(server.id); }}
                                        className={cn(
                                            "w-full flex items-center gap-3 p-2 rounded-xl transition-all duration-200",
                                            isActive
                                                ? "bg-neurix-orange/10 text-foreground border border-neurix-orange/20"
                                                : "hover:bg-muted/50 dark:hover:bg-white/[0.04] text-muted-foreground hover:text-foreground border border-transparent"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300",
                                            server.connected
                                                ? cn("border-border dark:border-white/10", visual.darkBg)
                                                : "border-border dark:border-white/5 bg-muted/50 dark:bg-white/[0.03] text-muted-foreground"
                                        )}>
                                            <ServerIcon size={18} />
                                        </div>
                                        {!isCollapsed && (
                                            <div className="flex-1 text-left min-w-0">
                                                <div className="text-sm font-medium leading-none mb-1 truncate">{server.name}</div>
                                                <div className={cn(
                                                    "text-[10px] font-mono transition-colors",
                                                    server.connected ? "text-mint-green/70" : "text-muted-foreground/50"
                                                )}>
                                                    {server.connected ? 'Online' : 'Offline'}
                                                </div>
                                            </div>
                                        )}
                                    </button>
                                    {server.connected && (
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                            <div className="w-2 h-2 rounded-full bg-mint-green shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Pinned */}
                {pinnedSessions.length > 0 && (
                    <div className="px-3">
                        {!isCollapsed && (
                            <h3 className="text-[10px] font-mono font-bold text-muted-foreground mb-3 px-2 uppercase tracking-widest flex items-center gap-1.5">
                                <Pin size={10} className="text-neurix-orange" /> Pinned
                            </h3>
                        )}
                        <div className="space-y-1">{pinnedSessions.map(s => renderSessionItem(s))}</div>
                    </div>
                )}

                {/* Chats */}
                <div className="px-3">
                    {!isCollapsed && (
                        <div className="flex items-center justify-between mb-3 px-2">
                            <h3 className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Chats</h3>
                            <button onClick={createSession} className="text-muted-foreground hover:text-neurix-orange transition-colors"><Plus size={16} /></button>
                        </div>
                    )}
                    <div className="space-y-1">
                        {unpinnedSessions.slice(0, 15).map(s => renderSessionItem(s))}
                        {isCollapsed && (
                            <button onClick={createSession} className="w-full flex items-center justify-center p-2 mt-2 rounded-lg bg-muted/50 dark:bg-white/[0.03] hover:bg-neurix-orange/10 text-muted-foreground hover:text-neurix-orange border border-border hover:border-neurix-orange/20 transition-all">
                                <Plus size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-3 mt-auto border-t border-border space-y-0.5 shrink-0">
                {[
                    { icon: User, label: 'Profile', onClick: () => setShowProfileDialog(true), active: false },
                    { icon: Terminal, label: 'Tools HUD', onClick: () => setIsToolsPanelOpen(!isToolsPanelOpen), active: isToolsPanelOpen },
                    { icon: Settings, label: 'Settings', onClick: () => setShowSettingsDialog(true), active: false },
                ].map(({ icon: Icon, label, onClick, active }) => (
                    <button
                        key={label}
                        onClick={onClick}
                        className={cn(
                            "w-full flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200",
                            active
                                ? "text-neurix-orange bg-neurix-orange/10 border border-neurix-orange/15"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50 dark:hover:bg-white/[0.04] border border-transparent"
                        )}
                    >
                        <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                            active ? "bg-neurix-orange/15" : "bg-muted/50 dark:bg-white/[0.03]"
                        )}>
                            <Icon size={16} />
                        </div>
                        {!isCollapsed && <span className="text-sm">{label}</span>}
                    </button>
                ))}
            </div>
        </motion.div>
    );
}
