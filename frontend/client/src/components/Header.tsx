import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Bell,
    Menu,
    X,
    Command,
    CheckCheck,
    FolderOpen,
    Zap,
    MessageSquare,
    Activity,
    Sun,
    Moon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ActivityItem } from '@/types';
import { Logo } from '@/components/Logo';

interface HeaderProps {
    theme: 'light' | 'dark';
    onToggleSidebar: () => void;
    isSidebarOpen: boolean;
    connectedServers: number;
    activities: ActivityItem[];
    unreadCount: number;
    onMarkAllRead: () => void;
    onToggleTheme: () => void;
    onBackToLanding?: () => void;
}

const getActivityIcon = (type: string): React.ElementType => {
    switch (type) {
        case 'list': return FolderOpen;
        case 'search': return Search;
        case 'connect': case 'disconnect': return Zap;
        case 'message': return MessageSquare;
        default: return Activity;
    }
};

export function Header({
    theme: _theme,
    onToggleSidebar,
    isSidebarOpen,
    connectedServers,
    activities,
    unreadCount,
    onMarkAllRead,
    onToggleTheme,
    onBackToLanding,
}: HeaderProps): React.ReactElement {
    const [searchFocused, setSearchFocused] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);

    const neuralIntegrity = Math.round((connectedServers / 4) * 100);

    return (
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur-3xl sticky top-0 z-40">
            <div className="h-full px-6 flex items-center justify-between gap-6">
                {/* Left Section */}
                <div className="flex items-center gap-4">
                    {/* Mobile Menu */}
                    <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 rounded-xl hover:bg-white/5 bg-white/[0.02] border border-white/5" onClick={onToggleSidebar}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={isSidebarOpen ? 'close' : 'menu'}
                                initial={{ rotate: -90, opacity: 0 }}
                                animate={{ rotate: 0, opacity: 1 }}
                                exit={{ rotate: 90, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                            >
                                {isSidebarOpen ? <X className="h-5 w-5 text-slate-grey" /> : <Menu className="h-5 w-5 text-slate-grey" />}
                            </motion.div>
                        </AnimatePresence>
                    </Button>

                    {/* Logo */}
                    <button
                        onClick={onBackToLanding}
                        className="hover:opacity-80 transition-opacity flex items-center gap-2"
                        title="Back to Home"
                    >
                        <Logo />
                    </button>

                    {/* Divider */}
                    <div className="hidden md:block w-px h-8 bg-border" />

                    {/* Connection Status */}
                    <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-border shadow-sm backdrop-blur-md">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-medium text-slate-grey/80 uppercase tracking-widest drop-shadow-sm">Sys.Status</span>
                            <div className="relative w-20 h-1.5 bg-black/10 dark:bg-black/50 rounded-full overflow-hidden border border-border">
                                <div
                                    className={cn(
                                        "absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out",
                                        neuralIntegrity >= 100
                                            ? "bg-mint-green shadow-[0_0_10px_rgba(16,185,129,0.8)]"
                                            : neuralIntegrity >= 50
                                                ? "bg-electric-purple shadow-[0_0_10px_rgba(139,92,246,0.8)]"
                                                : "bg-neurix-orange shadow-[0_0_10px_rgba(255,85,0,0.8)]"
                                    )}
                                    style={{ width: `${neuralIntegrity}%` }}
                                />
                            </div>
                            <span className={cn(
                                "text-[10px] font-mono font-bold tabular-nums drop-shadow-md",
                                neuralIntegrity >= 100 ? "text-mint-green"
                                    : neuralIntegrity >= 50 ? "text-electric-purple"
                                        : "text-neurix-orange"
                            )}>
                                {neuralIntegrity}%
                            </span>
                        </div>
                    </div>
                </div>

                {/* Center - Search */}
                <div className="hidden md:flex flex-1 max-w-lg justify-center">
                    <div className={cn("relative w-full transition-all duration-500 group", searchFocused && "scale-[1.02]")}>
                        <Search className={cn(
                            "absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300",
                            searchFocused ? "text-electric-purple drop-shadow-[0_0_5px_rgba(139,92,246,0.5)]" : "text-slate-grey group-hover:text-foreground"
                        )} />
                        <input
                            type="text"
                            placeholder="Query the central memory..."
                            onFocus={() => setSearchFocused(true)}
                            onBlur={() => setSearchFocused(false)}
                            className={cn(
                                "w-full h-10 pl-11 pr-16 bg-black/[0.02] dark:bg-[#0F051D]/60 backdrop-blur-3xl border border-border rounded-xl text-sm text-foreground placeholder:text-slate-grey/50 focus:outline-none transition-all duration-500 shadow-inner dark:shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]",
                                "focus:bg-background focus:border-electric-purple/40 focus:ring-1 focus:ring-electric-purple/20 focus:shadow-[0_0_20px_rgba(139,92,246,0.2)]",
                                "hover:bg-black/5 dark:hover:bg-white/[0.03] hover:border-black/10 dark:hover:border-white/10"
                            )}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 rounded-md bg-background border border-border text-slate-grey backdrop-blur-md">
                            <Command className="w-3 h-3" />
                            <span className="text-[10px] font-mono font-medium tracking-widest text-foreground">K</span>
                        </div>
                    </div>
                </div>

                {/* Right Section */}
                <div className="flex items-center gap-2">
                    {/* Notifications */}
                    <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-10 w-10 relative rounded-xl transition-all hover:bg-black/5 dark:hover:bg-white/5 group border border-transparent hover:border-border">
                                <Bell className="h-5 w-5 text-slate-grey group-hover:text-foreground transition-colors" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-electric-purple rounded-full ring-2 ring-background animate-pulse shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden bg-background/95 backdrop-blur-3xl border-border shadow-2xl">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-black/[0.02] dark:bg-white/[0.02]">
                                <span className="text-sm font-semibold font-heading tracking-wide text-foreground">System Logs</span>
                                {unreadCount > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs gap-1 text-slate-grey hover:text-electric-purple hover:bg-white/5"
                                        onClick={() => { onMarkAllRead(); }}
                                    >
                                        <CheckCheck className="w-3 h-3" />
                                        Mark all read
                                    </Button>
                                )}
                            </div>
                            <ScrollArea className="max-h-[300px]">
                                {activities.length === 0 ? (
                                    <div className="py-10 text-center">
                                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center border border-border">
                                            <Activity className="w-5 h-5 text-slate-grey/50" />
                                        </div>
                                        <p className="text-sm text-slate-grey">No active signals.</p>
                                    </div>
                                ) : (
                                    activities.slice(0, 15).map((item) => {
                                        const IconComp = getActivityIcon(item.type);
                                        return (
                                            <div
                                                key={item.id}
                                                className={cn(
                                                    "flex items-start gap-3 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-b border-border last:border-0",
                                                    !item.read && "bg-electric-purple/[0.03]"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-border",
                                                    item.server === 'gdrive' ? "bg-blue-500/10 text-blue-400" :
                                                        item.server === 'gmail' ? "bg-red-500/10 text-red-400" :
                                                            item.server === 'gforms' ? "bg-purple-500/10 text-purple-400" :
                                                                item.server === 'gcalendar' ? "bg-teal-500/10 text-teal-400" :
                                                                    "bg-electric-purple/10 text-electric-purple"
                                                )}>
                                                    <IconComp className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0 space-y-0.5">
                                                    <p className="text-sm text-foreground leading-tight font-medium">{item.action}</p>
                                                    <p className="text-[10px] text-slate-grey font-mono uppercase tracking-wider">{item.serverName} &middot; {item.time}</p>
                                                </div>
                                                {!item.read && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-electric-purple shrink-0 mt-2 shadow-[0_0_5px_rgba(139,92,246,0.8)]" />
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </ScrollArea>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Theme Toggle */}
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-slate-grey hover:text-foreground hover:bg-black/5 dark:hover:text-white dark:hover:bg-white/5 border border-transparent hover:border-black/10 dark:hover:border-white/10 group transition-all" onClick={onToggleTheme}>
                        {_theme === 'dark' ? (
                            <Sun className="h-5 w-5 group-hover:rotate-45 transition-transform duration-300" />
                        ) : (
                            <Moon className="h-5 w-5 group-hover:-rotate-45 transition-transform duration-300" />
                        )}
                    </Button>
                </div>
            </div>
        </header>
    );
}
