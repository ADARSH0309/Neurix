import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useServer } from '../../context/ServerContext';
import { useChat } from '../../context/ChatContext';
import {
    MessageSquare, Plus, Cpu,
    ChevronRight, ChevronLeft, Search, MoreHorizontal, Pin, PinOff,
    Pencil, Trash2, Wifi, WifiOff, X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { getServerIcon } from '../../lib/server-utils';

export function NavigationDock() {
    const { servers, activeServerId, setActiveServerId, connectServer, disconnectServer } = useServer();
    const { sessions, activeSessionId, setActiveSessionId, createSession, deleteSession, renameSession, pinSession, unpinSession } = useChat();

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showServicesPanel, setShowServicesPanel] = useState(false);
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
        const menuHeight = 110;
        const spaceBelow = window.innerHeight - rect.bottom;
        const top = spaceBelow < menuHeight ? rect.top - menuHeight : rect.bottom + 4;
        setContextMenuPos({ top, left: rect.right - 160 });
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
    const totalCount = Object.values(servers).length;

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
        <>
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
                                className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg bg-muted dark:bg-white/[0.08] text-foreground hover:bg-muted/80 dark:hover:bg-white/[0.12] border border-border transition-colors text-sm font-medium"
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
                            <button onClick={createSession} className="h-9 w-9 rounded-lg flex items-center justify-center bg-muted dark:bg-white/[0.08] text-foreground hover:bg-muted/80 dark:hover:bg-white/[0.12] border border-border transition-colors">
                                <Plus size={16} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Services Tab Button */}
                {!isCollapsed && (
                    <div className="px-3 pt-3 pb-1 shrink-0">
                        <button
                            onClick={() => setShowServicesPanel(!showServicesPanel)}
                            className={cn(
                                "w-full flex items-center justify-between h-8 px-3 rounded-lg text-xs font-medium transition-all border",
                                showServicesPanel
                                    ? "bg-primary/10 dark:bg-electric-purple/15 text-foreground border-primary/20 dark:border-electric-purple/25"
                                    : "bg-muted/50 dark:bg-white/[0.04] text-muted-foreground hover:text-foreground border-border hover:border-primary/20"
                            )}
                        >
                            <div className="flex items-center gap-1.5">
                                <Cpu size={13} />
                                Services
                            </div>
                            <span className={cn(
                                "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                                connectedCount > 0
                                    ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                                    : "text-muted-foreground/60 bg-muted"
                            )}>
                                {connectedCount}/{totalCount}
                            </span>
                        </button>
                    </div>
                )}

                {/* Collapsed services icon */}
                {isCollapsed && (
                    <div className="flex flex-col items-center pt-3 px-2 shrink-0">
                        <button
                            onClick={() => { setShowServicesPanel(!showServicesPanel); }}
                            className={cn(
                                "h-9 w-9 rounded-lg flex items-center justify-center transition-colors relative",
                                showServicesPanel ? "bg-muted dark:bg-white/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                            title="Services"
                        >
                            <Cpu size={16} />
                            {connectedCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            )}
                        </button>
                    </div>
                )}

                {/* Search */}
                {!isCollapsed && (
                    <div className="px-3 pt-2 pb-1 shrink-0">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input
                                type="text" placeholder="Search chats..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                className="w-full h-8 pl-9 pr-3 rounded-lg bg-muted/50 dark:bg-white/[0.04] border border-border text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/40 transition-all"
                            />
                        </div>
                    </div>
                )}

                {/* Chat Sessions */}
                <div className="flex-1 overflow-y-auto no-scrollbar py-2 space-y-3">
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

                    {/* Recent */}
                    <div className="px-3">
                        {!isCollapsed && (
                            <h3 className="text-[10px] font-semibold text-muted-foreground/70 mb-2 px-1 uppercase tracking-widest">Recent</h3>
                        )}
                        <div className="space-y-0.5">
                            {unpinnedSessions.slice(0, 20).map(s => renderSessionItem(s))}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Services Panel — Landscape Popup */}
            {createPortal(
                <AnimatePresence>
                    {showServicesPanel && (
                        <>
                            {/* Backdrop */}
                            <motion.div
                                key="services-backdrop"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
                                onClick={() => setShowServicesPanel(false)}
                            />
                            {/* Panel */}
                            <motion.div
                                key="services-panel"
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                className="fixed z-[9999] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-3xl bg-background/95 backdrop-blur-3xl border border-border rounded-2xl shadow-2xl dark:shadow-[0_25px_60px_rgba(0,0,0,0.6)]"
                            >
                            {/* Panel Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-primary/10 dark:bg-electric-purple/15 flex items-center justify-center">
                                        <Cpu size={18} className="text-primary dark:text-electric-purple" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-semibold text-foreground">MCP Services</h2>
                                        <p className="text-[11px] text-muted-foreground">
                                            {connectedCount} of {totalCount} nodes online
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowServicesPanel(false)}
                                    className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Panel Body — Grid */}
                            <div className="p-5 grid grid-cols-2 lg:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto no-scrollbar">
                                {Object.values(servers).map(server => {
                                    const ServerIcon = getServerIcon(server.id);
                                    const isActive = activeServerId === server.id && server.connected;

                                    return (
                                        <div
                                            key={server.id}
                                            className={cn(
                                                "rounded-xl border p-4 transition-all duration-200 flex flex-col gap-3",
                                                server.connected
                                                    ? isActive
                                                        ? "border-primary/30 dark:border-electric-purple/30 bg-primary/5 dark:bg-electric-purple/8"
                                                        : "border-border bg-muted/20 dark:bg-white/[0.02] hover:border-primary/20 dark:hover:border-electric-purple/20"
                                                    : "border-border bg-muted/10 dark:bg-white/[0.01]"
                                            )}
                                        >
                                            {/* Server Info */}
                                            <div className="flex items-start gap-3">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden transition-all",
                                                    server.connected
                                                        ? "bg-background dark:bg-white/[0.08] shadow-sm"
                                                        : "bg-muted/50 dark:bg-white/[0.03] opacity-50"
                                                )}>
                                                    <ServerIcon size={22} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-foreground truncate">{server.name}</div>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <span className={cn(
                                                            "w-2 h-2 rounded-full shrink-0",
                                                            server.connected ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" : "bg-muted-foreground/25"
                                                        )} />
                                                        <span className={cn(
                                                            "text-[11px]",
                                                            server.connected ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/50"
                                                        )}>
                                                            {server.connected ? 'Connected' : 'Offline'}
                                                        </span>
                                                    </div>
                                                    {server.connected && server.tools && (
                                                        <p className="text-[10px] text-muted-foreground/50 mt-1">{server.tools.length} tools available</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-2 mt-auto">
                                                {server.connected ? (
                                                    <>
                                                        <button
                                                            onClick={() => { setActiveServerId(server.id); setShowServicesPanel(false); }}
                                                            className={cn(
                                                                "flex-1 h-8 rounded-lg text-xs font-medium transition-colors",
                                                                isActive
                                                                    ? "bg-primary/15 dark:bg-electric-purple/20 text-primary dark:text-electric-purple"
                                                                    : "bg-muted dark:bg-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-muted/80 dark:hover:bg-white/[0.1]"
                                                            )}
                                                        >
                                                            {isActive ? 'Active' : 'Select'}
                                                        </button>
                                                        <button
                                                            onClick={() => disconnectServer(server.id)}
                                                            className="h-8 w-8 rounded-lg flex items-center justify-center bg-muted dark:bg-white/[0.06] text-muted-foreground hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                                            title="Disconnect"
                                                        >
                                                            <WifiOff size={13} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => connectServer(server.id)}
                                                        className="flex-1 h-8 rounded-lg text-xs font-medium bg-muted dark:bg-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-muted/80 dark:hover:bg-white/[0.1] transition-colors flex items-center justify-center gap-1.5"
                                                    >
                                                        <Wifi size={12} />
                                                        Connect
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}
