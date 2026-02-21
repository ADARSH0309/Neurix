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
                    className="fixed right-0 top-0 h-full w-80 lg:w-96 glass-panel-elevated border-l border-white/10 z-50 flex flex-col shadow-2xl shadow-black/50"
                >
                    {/* HUD Header */}
                    <div className="h-16 px-5 flex items-center justify-between border-b border-white/5 bg-white/5 backdrop-blur-md">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-neurix-orange/20 flex items-center justify-center border border-neurix-orange/30 shadow-[0_0_10px_rgba(255,85,0,0.3)]">
                                <Terminal className="w-4 h-4 text-neurix-orange" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm tracking-wide text-white">SYSTEM HUD</h3>
                                <p className="text-[10px] text-slate-400 font-mono">v2.0.4 ACTIVE</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/10 text-slate-400 hover:text-white" onClick={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Tabs */}
                    <div className="p-4 border-b border-white/5">
                        <div className="flex p-1 bg-black/40 rounded-xl border border-white/5 relative">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "relative flex-1 py-2 rounded-lg text-xs font-medium transition-all z-10",
                                        activeTab === tab.id ? "text-white" : "text-slate-400 hover:text-white"
                                    )}
                                >
                                    {activeTab === tab.id && (
                                        <motion.div
                                            layoutId="hudTab"
                                            className="absolute inset-0 bg-white/10 rounded-lg shadow-sm border border-white/5"
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
                                                            "p-3 rounded-xl border transition-all group relative overflow-hidden",
                                                            server.connected
                                                                ? "bg-neurix-orange/5 border-neurix-orange/30 hover:bg-neurix-orange/10"
                                                                : "bg-white/5 border-white/5 hover:border-white/10"
                                                        )}
                                                    >
                                                        {server.connected && <div className="absolute inset-0 bg-gradient-to-r from-neurix-orange/10 to-transparent opacity-50" />}

                                                        <div className="relative flex items-center gap-3 z-10">
                                                            <div className={cn(
                                                                "w-10 h-10 rounded-lg flex items-center justify-center border transition-all shadow-lg",
                                                                server.connected
                                                                    ? "bg-neurix-orange/20 border-neurix-orange/30 text-neurix-orange shadow-neurix-orange/20"
                                                                    : "bg-white/5 border-white/10 text-slate-400"
                                                            )}>
                                                                <Icon className="w-5 h-5" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between mb-0.5">
                                                                    <span className={cn("text-sm font-medium", server.connected ? "text-white" : "text-slate-300")}>{server.name}</span>
                                                                    {server.connected && <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />}
                                                                </div>
                                                                <p className="text-[10px] text-slate-500 truncate">{server.description}</p>
                                                            </div>
                                                        </div>

                                                        <div className="relative mt-3 pt-3 border-t border-white/5 flex gap-2 z-10">
                                                            <Button
                                                                size="sm"
                                                                variant={server.connected ? "destructive" : "default"}
                                                                className={cn(
                                                                    "w-full h-7 text-[10px] uppercase tracking-wide font-semibold",
                                                                    !server.connected && "bg-neurix-orange hover:bg-neurix-orange-light text-white border-none"
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
                                                            <div className="w-8 h-8 rounded flex items-center justify-center bg-white/5">
                                                                <Icon className="w-4 h-4 text-slate-400" />
                                                            </div>
                                                            <span className="text-xs font-medium text-slate-400">{server.name}</span>
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
                                                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5 transition-all text-left group"
                                                    >
                                                        <Command className="w-3.5 h-3.5 text-slate-500 group-hover:text-neurix-orange transition-colors" />
                                                        <div className="min-w-0">
                                                            <div className="text-xs font-mono text-slate-300 group-hover:text-white transition-colors truncate">{tool.name}</div>
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
                                                        <div className="absolute left-[7px] top-2.5 w-1.5 h-1.5 rounded-full bg-slate-800 border border-slate-600 group-hover:border-neurix-orange group-hover:bg-neurix-orange transition-colors z-10" />
                                                        <div className="p-2.5 rounded-lg border border-white/5 bg-black/20 hover:bg-white/5 transition-colors">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <Icon className="w-3 h-3 text-neurix-orange" />
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase">{activity.serverName}</span>
                                                                <span className="ml-auto text-[9px] font-mono text-slate-600">{activity.time}</span>
                                                            </div>
                                                            <p className="text-xs text-slate-300 leading-tight">{activity.action}</p>
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
