import { motion } from 'framer-motion';
import {
    Brain,
    FolderOpen,
    Search,
    Zap,
    FormInput,
    Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { McpServer, UserProfile } from '@/types';
import { getServerIcon, getServerColor } from '@/lib/server-utils';
import { ConnectButton } from '@/components/ConnectButton';

interface WelcomeScreenProps {
    profile: UserProfile;
    servers: Record<string, McpServer>;
    onConnect: (serverId: string) => void;
    onQuickAction: (action: string) => void;
    onNewChat: () => void;
}

const quickActions = [
    { icon: FolderOpen, title: 'Browse Files', description: 'View all your Drive files', bgColor: 'bg-electric-purple/10', iconBg: 'bg-electric-purple', action: 'List my files', textColor: 'text-electric-purple' },
    { icon: Search, title: 'Smart Search', description: 'Find files quickly', bgColor: 'bg-blue-500/10', iconBg: 'bg-blue-500', action: 'Search files', textColor: 'text-blue-400' },
    { icon: FormInput, title: 'Manage Forms', description: 'Create and edit forms', bgColor: 'bg-mint-green/10', iconBg: 'bg-mint-green', action: 'List my forms', textColor: 'text-mint-green' },
    { icon: Zap, title: 'Quick Help', description: 'See available commands', bgColor: 'bg-amber-500/10', iconBg: 'bg-amber-500', action: 'Help', textColor: 'text-amber-500' },
];

export function WelcomeScreen({
    profile,
    servers,
    onConnect,
    onQuickAction,
    onNewChat,
}: WelcomeScreenProps): React.ReactElement {
    const availableServers = Object.values(servers).filter(s => s.status === 'available');
    const comingSoonServers = Object.values(servers).filter(s => s.status === 'coming_soon');
    const hasConnected = Object.values(servers).some(s => s.connected);

    return (
        <div className="flex-1 flex flex-col h-full bg-background/50">
            <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
                <div className="max-w-3xl w-full space-y-10">
                    {/* Logo & Greeting */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center space-y-5"
                    >
                        <div className="relative w-20 h-20 mx-auto group">
                            <div className="absolute inset-0 bg-electric-purple/20 rounded-2xl rotate-3 blur-md transition-all group-hover:rotate-6 group-hover:blur-lg opacity-50" />
                            <div className="relative w-full h-full rounded-2xl bg-midnight border border-white/10 flex items-center justify-center shadow-2xl shadow-electric-purple/10 backdrop-blur-xl">
                                <Brain className="w-10 h-10 text-electric-purple drop-shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-3xl md:text-4xl font-bold font-heading tracking-tight text-white">
                                Welcome back, <span className="text-electric-purple">{profile.name}</span>
                            </h1>
                            <p className="text-slate-grey text-lg max-w-md mx-auto leading-relaxed">
                                Neural systems online. Ready to assist with your workflow.
                            </p>
                        </div>
                    </motion.div>

                    {/* MCP Service Cards */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <h2 className="text-xs font-bold text-slate-grey uppercase tracking-widest mb-4 text-center">
                            Connected Neural Nodes
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            {availableServers.map((server) => {
                                const Icon = getServerIcon(server.id);
                                return (
                                    <motion.div
                                        key={server.id}
                                        whileHover={{ y: -2 }}
                                        className="group p-5 rounded-2xl bg-glass-panel border border-white/5 hover:border-electric-purple/30 transition-all hover:bg-white/[0.03]"
                                    >
                                        <div className="flex items-start gap-4">
                                            {/* Icon with glow */}
                                            <div className="relative shrink-0">
                                                <div className={cn(
                                                    "absolute inset-0 rounded-xl opacity-20 blur-md transition-opacity group-hover:opacity-40",
                                                    server.connected ? "bg-electric-purple" : "bg-white"
                                                )} />
                                                <div className={cn(
                                                    "relative w-12 h-12 rounded-xl flex items-center justify-center border transition-all",
                                                    server.connected
                                                        ? "bg-electric-purple/10 border-electric-purple/20 text-electric-purple"
                                                        : "bg-white/5 border-white/10 text-slate-grey group-hover:text-white"
                                                )}>
                                                    <Icon className="w-6 h-6" />
                                                </div>
                                                {server.connected && (
                                                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-mint-green rounded-full border-2 border-midnight shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <h3 className="font-semibold font-heading text-base text-white group-hover:text-electric-purple transition-colors">{server.name}</h3>
                                                    {server.connected && (
                                                        <span className="text-[10px] uppercase font-bold text-mint-green bg-mint-green/10 px-2 py-0.5 rounded-full border border-mint-green/20">
                                                            Active
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-grey leading-snug">{server.description}</p>
                                                <div className="mt-4">
                                                    <ConnectButton
                                                        connected={server.connected}
                                                        onConnect={() => onConnect(server.id)}
                                                        className={cn(
                                                            "w-full justify-center h-9 text-xs font-medium border transition-colors",
                                                            server.connected
                                                                ? "bg-mint-green/10 border-mint-green/20 text-mint-green hover:bg-mint-green/20"
                                                                : "bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20"
                                                        )}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* Coming Soon */}
                        {comingSoonServers.length > 0 && (
                            <div className="mt-6 flex flex-col items-center">
                                <p className="text-[10px] font-bold text-slate-grey uppercase tracking-widest mb-3">Expansion Modules</p>
                                <div className="flex flex-wrap justify-center gap-3">
                                    {comingSoonServers.map((server) => {
                                        const Icon = getServerIcon(server.id);
                                        return (
                                            <div key={server.id} className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-slate-grey/70">
                                                <Icon className="w-3.5 h-3.5" />
                                                <span className="text-xs font-medium">{server.name}</span>
                                                <span className="text-[9px] font-bold bg-white/5 px-1.5 py-0.5 rounded ml-1">SOON</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </motion.div>

                    {/* Quick Actions */}
                    {hasConnected && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="pt-4 border-t border-white/5"
                        >
                            <h2 className="text-xs font-bold text-slate-grey uppercase tracking-widest mb-4 text-center">
                                Quick Commands
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {quickActions.map((action) => (
                                    <motion.button
                                        key={action.title}
                                        whileHover={{ scale: 1.02, y: -2 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => onQuickAction(action.action)}
                                        className={cn(
                                            "p-4 rounded-xl text-left transition-all border border-white/5 hover:border-white/10 hover:bg-white/5 group relative overflow-hidden"
                                        )}
                                    >
                                        <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity", action.bgColor)} />
                                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-transform group-hover:scale-110", action.bgColor)}>
                                            <action.icon className={cn("w-5 h-5", action.textColor)} />
                                        </div>
                                        <h3 className="font-medium text-sm text-white group-hover:text-electric-purple transition-colors">{action.title}</h3>
                                        <p className="text-xs text-slate-grey mt-1 leading-tight opacity-70 group-hover:opacity-100">{action.description}</p>
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* New Chat CTA */}
                    {hasConnected && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-center pt-2"
                        >
                            <Button
                                onClick={onNewChat}
                                size="lg"
                                className="h-12 px-8 rounded-xl gap-2 bg-electric-purple text-white hover:bg-electric-purple/90 shadow-lg shadow-electric-purple/20 hover:shadow-electric-purple/40 transition-all hover:scale-105"
                            >
                                <Plus className="w-5 h-5" />
                                <span className="font-heading font-semibold tracking-wide">Initialize New Session</span>
                            </Button>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}
