import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useServer } from '../../context/ServerContext';
import { useChat } from '../../context/ChatContext';
import { useUI } from '../../context/UIContext';
import {
    MessageSquare, Plus, Terminal,
    ChevronRight, ChevronLeft, Search, MoreHorizontal, Pin, PinOff,
    Pencil, Trash2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';
import { getServerIcon } from '../../lib/server-utils';

export function NavigationDock() {
    const { servers, activeServerId, setActiveServerId, connectServer } = useServer();
    const { sessions, activeSessionId, setActiveSessionId, createSession, deleteSession, renameSession, pinSession, unpinSession } = useChat();
    const { setIsToolsPanelOpen, isToolsPanelOpen } = useUI();

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [contextMenuId, setContextMenuId] = useState<string | null>(null);
    const [contextMenuPos, setContextMenuPos] = useState<{ top: number; left: number } | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const editInputRef = useRef<HTMLInputElement>(null);

    // Close context menu on outside click or scroll
    useEffect(() => {
        if (!contextMenuId) return;
        const close = () => setContextMenuId(null);
        window.addEventListener('scroll', close, true);
        window.addEventListener('click', close);
        return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('click', close); };
    }, [contextMenuId]);

    const openContextMenu = useCallback((e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        if (contextMenuId === sessionId) { setContextMenuId(null); return; }
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setContextMenuPos({ top: rect.bottom + 4, left: rect.right - 160 });
        setContextMenuId(sessionId);
    }, [contextMenuId]);

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

    const connectedCount = Object.values(servers).filter(s => s.connected).length;

    const renderSessionItem = (session: typeof sessions[0]) => {
        const isActive = activeSessionId === session.id;
        const isEditing = editingId === session.id;

        return (
            <div key={session.id} className="group relative">
                {isEditing ? (
                    <div className="flex items-center gap-2 p-2">
                        <MessageSquare size={16} className="shrink-0 text-muted-foreground" />
                        <input
                            ref={editInputRef} value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            onBlur={() => handleRenameSubmit(session.id)}
                            onKeyDown={e => { if (e.key === 'Enter') handleRenameSubmit(session.id); if (e.key === 'Escape') setEditingId(null); }}
                            className="flex-1 bg-muted border border-primary/30 rounded px-2 py-1 text-sm text-foreground outline-none focus:border-primary/50 font-mono"
                        />
                    </div>
                ) : (
                    <button
                        onClick={() => setActiveSessionId(session.id)}
                        className={cn(
                            "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-[13px]",
                            isActive
                                ? "bg-primary/10 dark:bg-electric-purple/15 text-foreground font-medium border border-primary/20 dark:border-electric-purple/25"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/80 dark:hover:bg-white/[0.05] border border-transparent"
                        )}
                    >
                        <MessageSquare size={15} className="shrink-0" />
                        {!isCollapsed && (
                            <>
                                <span className="truncate flex-1 text-left">{session.title}</span>
                                {session.pinned && <Pin size={11} className="shrink-0 text-primary dark:text-neurix-orange" />}
                                <button
                                    onClick={(e) => openContextMenu(e, session.id)}
                                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted"
                                >
                                    <MoreHorizontal size={14} />
                                </button>
                            </>
                        )}
                    </button>
                )}

                {contextMenuId === session.id && !isCollapsed && contextMenuPos && createPortal(
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        style={{ position: 'fixed', top: contextMenuPos.top, left: contextMenuPos.left }}
                        className="z-[9999] w-40 rounded-lg bg-popover border border-border shadow-xl py-1"
                        onClick={(e) => e.stopPropagation()}
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
                    </motion.div>,
                    document.body
                )}
            </div>
        );
    };

    return (
        <motion.div
            initial={{ width: 260 }} animate={{ width: isCollapsed ? 64 : 260 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="h-full relative z-20 flex flex-col bg-white dark:bg-[#0A0316]/95 text-foreground border-r border-border shadow-sm dark:shadow-[8px_0_30px_rgba(15,5,29,0.3)]"
        >
            {/* Header — New Chat + Collapse */}
            <div className="px-3 py-3 flex items-center gap-2 border-b border-border shrink-0">
                {!isCollapsed ? (
                    <>
                        <button
                            onClick={createSession}
                            className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
                        >
                            <Plus size={16} />
                            New Chat
                        </button>
                        <button onClick={toggleDock} className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                            <ChevronLeft size={18} />
                        </button>
                    </>
                ) : (
                    <div className="flex flex-col items-center gap-2 w-full">
                        <button onClick={toggleDock} className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                            <ChevronRight size={18} />
                        </button>
                        <button onClick={createSession} className="h-9 w-9 rounded-lg flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                            <Plus size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* Search */}
            {!isCollapsed && (
                <div className="px-3 pt-3 pb-1 shrink-0">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            className="w-full h-8 pl-9 pr-3 rounded-lg bg-muted/50 dark:bg-white/[0.04] border border-border text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/40 transition-all"
                        />
                    </div>
                </div>
            )}

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar py-3 space-y-4">

                {/* Services */}
                <div className="px-3">
                    {!isCollapsed && (
                        <div className="flex items-center justify-between mb-2 px-1">
                            <h3 className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">Services</h3>
                            {connectedCount > 0 && (
                                <span className="text-[9px] font-medium text-primary bg-primary/10 dark:bg-electric-purple/15 dark:text-electric-purple px-1.5 py-0.5 rounded-full">{connectedCount} active</span>
                            )}
                        </div>
                    )}
                    <div className="space-y-0.5">
                        {Object.values(servers).map(server => {
                            const ServerIcon = getServerIcon(server.id);
                            const isActive = activeServerId === server.id && server.connected;

                            return (
                                <button
                                    key={server.id}
                                    onClick={() => { if (server.connected) setActiveServerId(server.id); else connectServer(server.id); }}
                                    className={cn(
                                        "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-all duration-200 group",
                                        isActive
                                            ? "bg-primary/8 dark:bg-white/[0.08] text-foreground"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/80 dark:hover:bg-white/[0.05]"
                                    )}
                                >
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all overflow-hidden",
                                        server.connected
                                            ? "bg-muted dark:bg-white/[0.08]"
                                            : "bg-muted/50 dark:bg-white/[0.03] opacity-40"
                                    )}>
                                        <ServerIcon size={18} />
                                    </div>
                                    {!isCollapsed && (
                                        <div className="flex-1 text-left min-w-0">
                                            <div className="text-[13px] font-medium leading-tight truncate">{server.name}</div>
                                            <div className={cn(
                                                "text-[10px] transition-colors",
                                                server.connected ? "text-emerald-500" : "text-muted-foreground/40"
                                            )}>
                                                {server.connected ? 'Connected' : 'Offline'}
                                            </div>
                                        </div>
                                    )}
                                    {server.connected && !isCollapsed && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                    )}
                                    {server.connected && isCollapsed && (
                                        <div className="absolute right-1 top-1 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Divider */}
                <div className="mx-4 h-px bg-border" />

                {/* Pinned */}
                {pinnedSessions.length > 0 && (
                    <div className="px-3">
                        {!isCollapsed && (
                            <h3 className="text-[10px] font-semibold text-muted-foreground/70 mb-2 px-1 uppercase tracking-widest flex items-center gap-1.5">
                                <Pin size={9} className="text-primary dark:text-neurix-orange" /> Pinned
                            </h3>
                        )}
                        <div className="space-y-0.5">{pinnedSessions.map(s => renderSessionItem(s))}</div>
                    </div>
                )}

                {/* Chats */}
                <div className="px-3">
                    {!isCollapsed && (
                        <h3 className="text-[10px] font-semibold text-muted-foreground/70 mb-2 px-1 uppercase tracking-widest">Chats</h3>
                    )}
                    <div className="space-y-0.5">
                        {unpinnedSessions.slice(0, 20).map(s => renderSessionItem(s))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="px-3 py-2 border-t border-border shrink-0">
                <button
                    onClick={() => setIsToolsPanelOpen(!isToolsPanelOpen)}
                    className={cn(
                        "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-200",
                        isToolsPanelOpen
                            ? "text-foreground bg-primary/10 dark:bg-electric-purple/15"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/80 dark:hover:bg-white/[0.05]"
                    )}
                >
                    <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                        isToolsPanelOpen ? "bg-primary/15 dark:bg-electric-purple/20" : "bg-muted dark:bg-white/[0.06]"
                    )}>
                        <Terminal size={15} />
                    </div>
                    {!isCollapsed && <span className="text-[13px] font-medium">Tools HUD</span>}
                </button>
            </div>
        </motion.div>
    );
}
