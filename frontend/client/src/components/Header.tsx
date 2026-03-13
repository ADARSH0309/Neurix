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
                    <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-border shadow-sm backdrop-blur-md">
                        <span className={cn(
                            "w-2 h-2 rounded-full shrink-0",
                            connectedServers > 0
                                ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"
                                : "bg-slate-400/50"
                        )} />
                        <span className={cn(
                            "text-[11px] font-semibold",
                            connectedServers > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                        )}>
                            {connectedServers > 0 ? `${connectedServers} Connected` : 'No Services'}
                        </span>
                    </div>
                </div>

                {/* Center - Search */}
                <div className="hidden md:flex flex-1 max-w-md justify-center">
                    <div className="relative w-full group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                        <input
                            type="text"
                            placeholder="Search..."
                            onFocus={() => setSearchFocused(true)}
                            onBlur={() => setSearchFocused(false)}
                            className="w-full h-9 pl-10 pr-14 bg-muted/50 dark:bg-white/[0.04] border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
                        />
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-background border border-border text-muted-foreground">
                            <Command className="w-3 h-3" />
                            <span className="text-[10px] font-mono">K</span>
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
