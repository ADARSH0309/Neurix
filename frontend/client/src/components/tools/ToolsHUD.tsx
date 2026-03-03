import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useServer } from '../../context/ServerContext';
import { useChat } from '../../context/ChatContext';
import { useUI } from '../../context/UIContext';
import {
    X, Search, FolderOpen, FormInput, Brain, Zap, Activity,
    MessageSquare, FileText, HelpCircle, Command, Terminal
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getServerIcon } from '@/lib/server-utils';

interface ToolsHUDProps {
    isOpen: boolean;
    onClose: () => void;
}

const quickActions = [
    { id: 'list', name: 'List Files', icon: FileText, bgColor: 'bg-neurix-orange/10', iconBg: 'bg-neurix-orange', prompt: 'list my files' },
    { id: 'search', name: 'Search Files', icon: Search, bgColor: 'bg-sky-500/10', iconBg: 'bg-sky-500', prompt: 'search for ' },
    { id: 'forms', name: 'List Forms', icon: FormInput, bgColor: 'bg-emerald-500/10', iconBg: 'bg-emerald-500', prompt: 'list my forms' },
    { id: 'help', name: 'Help', icon: HelpCircle, bgColor: 'bg-amber-500/10', iconBg: 'bg-amber-500', prompt: 'help' },
];

const tabs = [
    { id: 'services' as const, label: 'Services' },
    { id: 'actions' as const, label: 'Actions' },
    { id: 'activity' as const, label: 'Activity' },
];

const getActivityIcon = (type: string): React.ElementType => {
    switch (type) {
        case 'list': return FolderOpen;
        case 'search': return Search;
        case 'connect': case 'disconnect': return Zap;
        case 'message': return MessageSquare;
        default: return Activity;
    }
};

export function ToolsHUD({ isOpen, onClose }: ToolsHUDProps) {
    const { servers, connectServer, disconnectServer } = useServer();
    const { sendMessage } = useChat();
    const { activities } = useUI();

    const [activeTab, setActiveTab] = useState<'services' | 'actions' | 'activity'>('services');

    const availableServers = Object.values(servers).filter(s => s.status === 'available');
    const comingSoonServers = Object.values(servers).filter(s => s.status === 'coming_soon');

    const handleConnect = (e: React.MouseEvent, serverId: string) => {
        e.stopPropagation();
        connectServer(serverId);
    };

    const handleDisconnect = (e: React.MouseEvent, serverId: string) => {
        e.stopPropagation();
        disconnectServer(serverId);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.aside
                    initial={{ x: '100%', opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: '100%', opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="dark fixed right-0 top-0 h-full w-80 lg:w-96 bg-background/95 text-foreground backdrop-blur-3xl border-l border-border z-50 flex flex-col shadow-[-8px_0_30px_rgba(56,25,50,0.15)]"
                >
                    {/* HUD Header */}
                    <div className="h-16 px-5 flex items-center justify-between border-b border-border bg-black/[0.02] dark:bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-electric-purple/10 flex items-center justify-center border border-electric-purple/20 shadow-[0_0_12px_rgba(139,92,246,0.3)]">
                                <Terminal className="w-4 h-4 text-electric-purple" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm tracking-wide text-foreground">SYSTEM HUD</h3>
                                <p className="text-[10px] text-slate-grey font-mono">v2.0.4 ACTIVE</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-slate-500 hover:text-foreground" onClick={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Tabs */}
                    <div className="p-4 border-b border-border">
                        <div className="flex p-1 bg-black/5 dark:bg-black/40 rounded-xl border border-black/5 dark:border-white/5 relative">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "relative flex-1 py-1.5 rounded-lg text-xs font-medium transition-all z-10",
                                        activeTab === tab.id ? "text-foreground" : "text-slate-grey hover:text-foreground"
                                    )}
                                >
                                    {activeTab === tab.id && (
                                        <motion.div
                                            layoutId="hudTab"
                                            className="absolute inset-0 bg-white dark:bg-white/10 rounded-lg shadow-sm border border-black/5 dark:border-white/5"
                                            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                    <span className="relative">{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    <ScrollArea className="flex-1">
                        <div className="p-5 space-y-6">

                            {/* Services Tab */}
                            {activeTab === 'services' && (
                                <div className="space-y-6">
                                    {/* Connected/Available */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between px-1">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Neural Nodes</span>
                                            <span className="text-[10px] font-mono text-neurix-orange bg-neurix-orange/10 px-2 py-0.5 rounded-full">{availableServers.filter(s => s.connected).length} Connected</span>
                                        </div>

                                        <div className="space-y-2">
                                            {availableServers.map((server) => {
                                                const Icon = getServerIcon(server.id);
                                                return (
                                                    <motion.div
                                                        key={server.id}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className={cn(
                                                            "p-3 rounded-xl border transition-all duration-300 group relative overflow-hidden",
                                                            server.connected
                                                                ? "bg-electric-purple/5 border-electric-purple/20 shadow-[0_0_15px_rgba(139,92,246,0.05)]"
                                                                : "bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
                                                        )}
                                                    >
                                                        {server.connected && <div className="absolute inset-0 bg-gradient-to-br from-electric-purple/10 to-transparent opacity-30" />}

                                                        <div className="relative flex items-center gap-3 z-10">
                                                            <div className={cn(
                                                                "w-10 h-10 rounded-lg flex items-center justify-center border transition-all duration-300 shadow-lg",
                                                                server.connected
                                                                    ? "bg-electric-purple/10 border-electric-purple/30 text-electric-purple shadow-[0_0_10px_rgba(139,92,246,0.2)]"
                                                                    : "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-slate-grey group-hover:text-foreground group-hover:border-black/20 dark:group-hover:border-white/20"
                                                            )}>
                                                                <Icon className="w-5 h-5" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between mb-0.5">
                                                                    <span className={cn("text-sm font-medium transition-colors", server.connected ? "text-foreground" : "text-slate-500 dark:text-slate-400 group-hover:text-foreground")}>{server.name}</span>
                                                                    {server.connected && <div className="w-1.5 h-1.5 rounded-full bg-mint-green animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />}
                                                                </div>
                                                                <p className="text-[10px] text-slate-500 truncate">{server.description}</p>
                                                            </div>
                                                        </div>

                                                        <div className="relative mt-3 pt-3 border-t border-border flex gap-2 z-10">
                                                            <Button
                                                                size="sm"
                                                                variant={server.connected ? "ghost" : "default"}
                                                                className={cn(
                                                                    "w-full h-7 text-[10px] uppercase tracking-wider font-semibold transition-all duration-300",
                                                                    server.connected ? "border border-border hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground text-slate-500 dark:text-slate-400" : "bg-black/5 dark:bg-white/5 text-foreground border border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 hover:border-black/20 dark:hover:border-white/20"
                                                                )}
                                                                onClick={(e) => server.connected ? handleDisconnect(e, server.id) : handleConnect(e, server.id)}
                                                            >
                                                                {server.connected ? 'Disconnect' : 'Initialize Connection'}
                                                            </Button>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Coming Soon */}
                                    {comingSoonServers.length > 0 && (
                                        <div className="space-y-3 pt-4 border-t border-white/5">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Offline Nodes</span>
                                            <div className="space-y-2">
                                                {comingSoonServers.map((server) => {
                                                    const Icon = getServerIcon(server.id);
                                                    return (
                                                        <div key={server.id} className="flex items-center gap-3 p-2 rounded-lg border border-white/5 opacity-40 bg-black/20 pointer-events-none grayscale">
                                                            <div className="w-8 h-8 rounded flex items-center justify-center bg-white/5 border border-white/5">
                                                                <Icon className="w-4 h-4 text-slate-grey" />
                                                            </div>
                                                            <span className="text-xs font-medium text-slate-grey">{server.name}</span>
                                                            <span className="ml-auto text-[9px] border border-white/10 px-1.5 py-0.5 rounded text-slate-500">OFFLINE</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Actions Tab */}
                            {activeTab === 'actions' && (
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Quick Commands</span>
                                        <div className="grid grid-cols-2 gap-2">
                                            {quickActions.map((action) => (
                                                <motion.button
                                                    key={action.id}
                                                    whileHover={{ scale: 1.02, y: -2 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => sendMessage(action.prompt)}
                                                    className={cn(
                                                        "p-3 rounded-xl text-left transition-all border border-white/5 hover:border-white/20 group relative overflow-hidden",
                                                        action.bgColor
                                                    )}
                                                >
                                                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2 shadow-lg", action.iconBg)}>
                                                        <action.icon className="w-4 h-4 text-white" />
                                                    </div>
                                                    <p className="text-xs font-semibold text-white group-hover:text-white/90">{action.name}</p>
                                                    <p className="text-[10px] text-white/50 mt-0.5 font-mono opacity-0 group-hover:opacity-100 transition-opacity">/run {action.id}</p>
                                                </motion.button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Tools List */}
                                    {availableServers.filter(s => s.connected && s.tools?.length).map(server => (
                                        <div key={server.id} className="space-y-2">
                                            <div className="flex items-center gap-2 px-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-neurix-orange" />
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{server.name}</span>
                                            </div>
                                            <div className="space-y-1">
                                                {server.tools?.map(tool => (
                                                    <button
                                                        key={tool.name}
                                                        onClick={() => sendMessage(tool.name.replace(/_/g, ' '))}
                                                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-border transition-all text-left group"
                                                    >
                                                        <Command className="w-3.5 h-3.5 text-slate-500 group-hover:text-neurix-orange transition-colors" />
                                                        <div className="min-w-0">
                                                            <div className="text-xs font-mono text-slate-500 dark:text-slate-300 group-hover:text-foreground transition-colors truncate">{tool.name}</div>
                                                            <div className="text-[10px] text-slate-500 truncate">{tool.description}</div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Activity Tab */}
                            {activeTab === 'activity' && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-1">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">System Logs</span>
                                        <span className="text-[10px] font-mono text-slate-500">{activities.length} Events</span>
                                    </div>

                                    <div className="space-y-2 relative">
                                        <div className="absolute left-2.5 top-2 bottom-2 w-px bg-white/5" />
                                        {activities.length === 0 ? (
                                            <div className="text-center py-10 opacity-50">
                                                <Activity className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                                                <p className="text-xs text-slate-500">System initialization complete.<br />Waiting for events...</p>
                                            </div>
                                        ) : (
                                            activities.slice(0, 20).map((activity, i) => {
                                                const Icon = getActivityIcon(activity.type);
                                                return (
                                                    <motion.div
                                                        key={activity.id}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: i * 0.05 }}
                                                        className="relative pl-7 py-1 group"
                                                    >
                                                        <div className="absolute left-[7px] top-2.5 w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 group-hover:border-neurix-orange group-hover:bg-neurix-orange transition-colors z-10" />
                                                        <div className="p-2.5 rounded-lg border border-border bg-black/[0.02] dark:bg-black/20 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <Icon className="w-3 h-3 text-neurix-orange" />
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase">{activity.serverName}</span>
                                                                <span className="ml-auto text-[9px] font-mono text-slate-500 dark:text-slate-600">{activity.time}</span>
                                                            </div>
                                                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-tight">{activity.action}</p>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>
                    </ScrollArea>
                </motion.aside>
            )}
        </AnimatePresence>
    );
}
