import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Search,
    FolderOpen,
    FormInput,
    Brain,
    Zap,
    Activity,
    MessageSquare,
    FileText,
    HelpCircle,
    Command,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { McpServer, ActivityItem } from '@/types';
import { getServerIcon } from '@/lib/server-utils';
import { ConnectButton } from '@/components/ConnectButton';

interface ToolsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    servers: Record<string, McpServer>;
    onConnect: (serverId: string) => void;
    onDisconnect: (serverId: string) => void;
    onToolAction: (action: string) => void;
    activities: ActivityItem[];
}

const quickActions = [
    { id: 'list', name: 'List Files', icon: FileText, bgColor: 'bg-electric-purple/10', iconBg: 'bg-electric-purple', prompt: 'list my files' },
    { id: 'search', name: 'Search Files', icon: Search, bgColor: 'bg-white/5', iconBg: 'bg-white/10', prompt: 'search for ' },
    { id: 'forms', name: 'List Forms', icon: FormInput, bgColor: 'bg-mint-green/10', iconBg: 'bg-mint-green', prompt: 'list my forms' },
    { id: 'help', name: 'Help', icon: HelpCircle, bgColor: 'bg-white/5', iconBg: 'bg-white/10', prompt: 'help' },
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

export function ToolsPanel({
    isOpen,
    onClose,
    servers,
    onConnect,
    onDisconnect,
    onToolAction,
    activities,
}: ToolsPanelProps): React.ReactElement {
    const [activeTab, setActiveTab] = useState<'services' | 'actions' | 'activity'>('services');

    const availableServers = Object.values(servers).filter(s => s.status === 'available');
    const comingSoonServers = Object.values(servers).filter(s => s.status === 'coming_soon');

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm"
                        onClick={onClose}
                    />

                    <motion.aside
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        className={cn(
                            "fixed right-0 top-0 h-full w-80 bg-midnight border-l border-white/5 z-50",
                            "lg:static lg:z-auto"
                        )}
                    >
                        <div className="flex flex-col h-full">
                            {/* Header */}
                            <div className="h-14 px-4 flex items-center justify-between border-b border-white/5 bg-background/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-electric-purple/20 flex items-center justify-center border border-electric-purple/30">
                                        <Brain className="w-4 h-4 text-electric-purple" />
                                    </div>
                                    <span className="font-heading font-bold text-sm tracking-wide">MCP Panel</span>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg lg:hidden hover:bg-white/5 hover:text-white" onClick={onClose}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Tabs */}
                            <div className="px-3 py-3 border-b border-white/5">
                                <div className="relative flex gap-1 p-1 bg-black/20 rounded-lg border border-white/5">
                                    {tabs.map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={cn(
                                                "relative flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-colors z-10",
                                                activeTab === tab.id
                                                    ? "text-white"
                                                    : "text-slate-grey hover:text-white"
                                            )}
                                        >
                                            {activeTab === tab.id && (
                                                <motion.div
                                                    layoutId="toolsPanelActiveTab"
                                                    className="absolute inset-0 bg-white/10 rounded-md border border-white/5 shadow-sm"
                                                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                                                />
                                            )}
                                            <span className="relative z-20">{tab.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Content */}
                            <ScrollArea className="flex-1 bg-midnight">
                                <div className="p-3 space-y-5">
                                    {/* Services Tab */}
                                    {activeTab === 'services' && (
                                        <>
                                            {/* Available Services */}
                                            <div className="space-y-3">
                                                <span className="text-[10px] font-bold text-slate-grey uppercase tracking-widest px-1">
                                                    Available Services
                                                </span>
                                                <div className="space-y-2">
                                                    {availableServers.map((server) => {
                                                        const Icon = getServerIcon(server.id);
                                                        return (
                                                            <div key={server.id} className="p-3 rounded-xl bg-gradient-to-br from-white/5 to-transparent border border-white/5 hover:border-electric-purple/30 transition-all group">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={cn(
                                                                        "relative w-10 h-10 rounded-lg flex items-center justify-center border transition-all",
                                                                        server.connected
                                                                            ? "bg-electric-purple/20 border-electric-purple/30 text-electric-purple"
                                                                            : "bg-white/5 border-white/10 text-slate-grey group-hover:text-white"
                                                                    )}>
                                                                        <Icon className="w-5 h-5" />
                                                                        {server.connected && (
                                                                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-mint-green rounded-full border-2 border-midnight" />
                                                                        )}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-medium text-white">{server.name}</p>
                                                                        <p className="text-xs text-slate-grey truncate">{server.description}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="mt-3">
                                                                    <ConnectButton
                                                                        connected={server.connected}
                                                                        onConnect={() => onConnect(server.id)}
                                                                        onDisconnect={() => onDisconnect(server.id)}
                                                                        showDisconnect={true}
                                                                        className="w-full justify-center rounded-lg h-8 text-xs bg-white/5 hover:bg-white/10 border-white/5"
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Coming Soon */}
                                            {comingSoonServers.length > 0 && (
                                                <div className="space-y-3">
                                                    <span className="text-[10px] font-bold text-slate-grey uppercase tracking-widest px-1">
                                                        Roadmap
                                                    </span>
                                                    <div className="space-y-2">
                                                        {comingSoonServers.map((server) => {
                                                            const Icon = getServerIcon(server.id);
                                                            return (
                                                                <div key={server.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 opacity-50 bg-black/20">
                                                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5">
                                                                        <Icon className="w-4 h-4 text-slate-grey" />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-medium text-slate-grey">{server.name}</p>
                                                                    </div>
                                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 text-slate-grey">
                                                                        SOON
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* Actions Tab - Dynamic Tools */}
                                    {activeTab === 'actions' && (
                                        <div className="space-y-5">
                                            {/* Quick Actions */}
                                            <div className="space-y-3">
                                                <span className="text-[10px] font-bold text-slate-grey uppercase tracking-widest px-1">
                                                    Quick Actions
                                                </span>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {quickActions.map((action) => (
                                                        <motion.button
                                                            key={action.id}
                                                            whileHover={{ scale: 1.02, y: -2 }}
                                                            whileTap={{ scale: 0.98 }}
                                                            onClick={() => onToolAction(action.prompt)}
                                                            className={cn(
                                                                "p-3 rounded-xl text-left transition-all border border-white/5 hover:border-white/10",
                                                                action.bgColor
                                                            )}
                                                        >
                                                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", action.iconBg)}>
                                                                <action.icon className={cn("w-4 h-4", action.iconBg === 'bg-white/10' ? "text-white" : "text-white")} />
                                                            </div>
                                                            <p className="text-xs font-medium text-white">{action.name}</p>
                                                        </motion.button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Dynamic Tools from Connected Servers */}
                                            {availableServers.filter(s => s.connected && s.tools && s.tools.length > 0).map((server) => {
                                                const Icon = getServerIcon(server.id);
                                                return (
                                                    <div key={server.id} className="space-y-3">
                                                        <div className="flex items-center gap-2 px-1">
                                                            <div className="w-5 h-5 rounded flex items-center justify-center bg-white/5">
                                                                <Icon className="w-3 h-3 text-slate-grey" />
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-grey uppercase tracking-widest">
                                                                {server.name}
                                                            </span>
                                                        </div>
                                                        <div className="space-y-1">
                                                            {server.tools?.slice(0, 10).map((tool) => (
                                                                <motion.button
                                                                    key={tool.name}
                                                                    whileHover={{ x: 4 }}
                                                                    onClick={() => onToolAction(tool.name.replace(/_/g, ' '))}
                                                                    className="w-full p-2.5 rounded-lg text-left hover:bg-white/5 border border-transparent hover:border-white/5 transition-all group"
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <Command className="w-3 h-3 text-slate-grey group-hover:text-electric-purple transition-colors" />
                                                                        <p className="text-xs font-mono text-slate-grey group-hover:text-white transition-colors">{tool.name}</p>
                                                                    </div>
                                                                    {tool.description && (
                                                                        <p className="text-[10px] text-slate-grey/50 truncate mt-0.5 ml-5">{tool.description}</p>
                                                                    )}
                                                                </motion.button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {/* No connected servers message */}
                                            {availableServers.filter(s => s.connected).length === 0 && (
                                                <div className="text-center py-12 px-4 rounded-xl border border-dashed border-white/5 bg-white/[0.02]">
                                                    <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center">
                                                        <Zap className="w-5 h-5 text-slate-grey" />
                                                    </div>
                                                    <p className="text-sm font-medium text-white">No Services Connected</p>
                                                    <p className="text-xs text-slate-grey mt-1">Connect a service to unlock powerful tools</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Activity Tab */}
                                    {activeTab === 'activity' && (
                                        <div className="space-y-3">
                                            <span className="text-[10px] font-bold text-slate-grey uppercase tracking-widest px-1">
                                                Recent Activity
                                            </span>
                                            {activities.length === 0 ? (
                                                <div className="text-center py-12 px-4 rounded-xl border border-dashed border-white/5 bg-white/[0.02]">
                                                    <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center">
                                                        <Activity className="w-5 h-5 text-slate-grey" />
                                                    </div>
                                                    <p className="text-sm font-medium text-white">Quiet on the Neural Net</p>
                                                    <p className="text-xs text-slate-grey mt-1">Activities will appear here</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {activities.map((activity, index) => {
                                                        const IconComponent = getActivityIcon(activity.type);
                                                        return (
                                                            <motion.div
                                                                key={activity.id}
                                                                initial={{ opacity: 0, x: -10 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                transition={{ delay: index * 0.05 }}
                                                                className="flex items-start gap-3 p-3 rounded-lg border border-white/5 hover:bg-white/5 transition-colors group"
                                                            >
                                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-white/5 group-hover:bg-electric-purple/20 transition-colors">
                                                                    <IconComponent className="w-4 h-4 text-slate-grey group-hover:text-electric-purple transition-colors" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs font-medium text-white leading-tight">{activity.action}</p>
                                                                    <p className="text-[10px] text-slate-grey font-mono mt-1">
                                                                        {activity.serverName} &middot; {activity.time}
                                                                    </p>
                                                                </div>
                                                            </motion.div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>

                            {/* Footer */}
                            <div className="p-4 border-t border-white/5 bg-background/50">
                                <motion.button
                                    onClick={() => onToolAction('help')}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full text-center text-xs text-electric-purple font-medium py-2.5 rounded-lg bg-electric-purple/10 hover:bg-electric-purple/20 transition-colors border border-electric-purple/20"
                                >
                                    View All Commands
                                </motion.button>
                            </div>
                        </div>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
}
