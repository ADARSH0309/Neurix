import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Bell,
    Settings,
    ChevronDown,
    User,
    LogOut,
    Menu,
    X,
    Command,
    Home,
    CheckCheck,
    FolderOpen,
    Zap,
    MessageSquare,
    Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ActivityItem, UserProfile } from '@/types';
import { Logo } from '@/components/Logo';

interface HeaderProps {
    profile: UserProfile;
    theme: 'light' | 'dark';
    onToggleSidebar: () => void;
    isSidebarOpen: boolean;
    connectedServers: number;
    activities: ActivityItem[];
    unreadCount: number;
    onMarkAllRead: () => void;
    onOpenProfile: () => void;
    onOpenSettings: () => void;
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
    profile,
    theme: _theme,
    onToggleSidebar,
    isSidebarOpen,
    connectedServers,
    activities,
    unreadCount,
    onMarkAllRead,
    onOpenProfile,
    onOpenSettings,
    onBackToLanding,
}: HeaderProps): React.ReactElement {
    const [searchFocused, setSearchFocused] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);

    const neuralIntegrity = Math.round((connectedServers / 2) * 100);

    return (
        <header className="h-16 border-b border-white/5 bg-background/80 backdrop-blur-xl sticky top-0 z-40">
            <div className="h-full px-6 flex items-center justify-between gap-6">
                {/* Left Section */}
                <div className="flex items-center gap-4">
                    {/* Mobile Menu */}
                    <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 rounded-lg hover:bg-white/5" onClick={onToggleSidebar}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={isSidebarOpen ? 'close' : 'menu'}
                                initial={{ rotate: -90, opacity: 0 }}
                                animate={{ rotate: 0, opacity: 1 }}
                                exit={{ rotate: 90, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                            >
                                {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                            </motion.div>
                        </AnimatePresence>
                    </Button>

                    {/* Logo */}
                    <button
                        onClick={onBackToLanding}
                        className="hover:opacity-80 transition-opacity"
                        title="Back to Home"
                    >
                        <Logo />
                    </button>

                    {/* Connection Status Divider */}
                    <div className="hidden md:block w-px h-8 bg-white/10" />

                    {/* Connection Status */}
                    <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-medium text-slate-grey uppercase tracking-widest">Sys.Status</span>
                            <div className="relative w-20 h-1.5 bg-black/40 rounded-full overflow-hidden">
                                <div
                                    className={cn(
                                        "absolute inset-y-0 left-0 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(0,0,0,0.5)]",
                                        neuralIntegrity >= 100
                                            ? "bg-mint-green shadow-mint-green/50"
                                            : neuralIntegrity >= 50
                                                ? "bg-electric-purple shadow-electric-purple/50"
                                                : "bg-amber-500 shadow-amber-500/50"
                                    )}
                                    style={{ width: `${neuralIntegrity}%` }}
                                />
                            </div>
                            <span className={cn(
                                "text-[10px] font-mono font-bold tabular-nums",
                                neuralIntegrity >= 100 ? "text-mint-green"
                                    : neuralIntegrity >= 50 ? "text-electric-purple"
                                        : "text-amber-500"
                            )}>
                                {neuralIntegrity}%
                            </span>
                        </div>
                    </div>
                </div>

                {/* Center - Search */}
                <div className="hidden md:flex flex-1 max-w-lg justify-center">
                    <div className={cn("relative w-full transition-all duration-200 group", searchFocused && "scale-[1.01]")}>
                        <Search className={cn(
                            "absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors",
                            searchFocused ? "text-electric-purple" : "text-slate-grey/50 group-hover:text-slate-grey"
                        )} />
                        <input
                            type="text"
                            placeholder="Search neural memory..."
                            onFocus={() => setSearchFocused(true)}
                            onBlur={() => setSearchFocused(false)}
                            className={cn(
                                "w-full h-11 pl-11 pr-16 bg-black/20 border border-white/5 rounded-xl text-sm text-primary placeholder:text-slate-grey/40 focus:outline-none transition-all",
                                "focus:bg-black/40 focus:border-electric-purple/30 focus:ring-1 focus:ring-electric-purple/20",
                                "hover:bg-black/30 hover:border-white/10"
                            )}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 border border-white/5 text-slate-grey/50">
                            <Command className="w-3 h-3" />
                            <span className="text-[10px] font-mono font-medium">K</span>
                        </div>
                    </div>
                </div>

                {/* Right Section */}
                <div className="flex items-center gap-2">
                    {/* Notifications */}
                    <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-10 w-10 relative rounded-xl hover:bg-white/5 data-[state=open]:bg-white/10 transition-all">
                                <Bell className="h-5 w-5 text-slate-grey hover:text-primary transition-colors" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-electric-purple rounded-full ring-2 ring-background animate-pulse" />
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden border-white/10 bg-glass-panel backdrop-blur-xl">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/5">
                                <span className="text-sm font-semibold font-heading tracking-wide text-primary">Notifications</span>
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
                                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center">
                                            <Bell className="w-5 h-5 text-slate-grey/30" />
                                        </div>
                                        <p className="text-sm text-slate-grey">No new signals</p>
                                    </div>
                                ) : (
                                    activities.slice(0, 15).map((item) => {
                                        const IconComp = getActivityIcon(item.type);
                                        return (
                                            <div
                                                key={item.id}
                                                className={cn(
                                                    "flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0",
                                                    !item.read && "bg-electric-purple/5"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border border-white/5",
                                                    item.server === 'gdrive' ? "bg-blue-500/10 text-blue-400" : "bg-electric-purple/10 text-electric-purple"
                                                )}>
                                                    <IconComp className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0 space-y-0.5">
                                                    <p className="text-sm text-primary leading-tight">{item.action}</p>
                                                    <p className="text-xs text-slate-grey font-mono">{item.serverName} &middot; {item.time}</p>
                                                </div>
                                                {!item.read && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-electric-purple shrink-0 mt-2 shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </ScrollArea>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Settings */}
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-white/5 transition-all text-slate-grey hover:text-primary" onClick={onOpenSettings}>
                        <Settings className="h-5 w-5" />
                    </Button>

                    {/* User Menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="gap-3 pl-2 pr-3 h-10 ml-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all">
                                <div className="h-7 w-7 rounded-lg overflow-hidden ring-1 ring-white/10">
                                    <Avatar className="h-full w-full">
                                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.name}`} />
                                        <AvatarFallback className="bg-gradient-to-br from-electric-purple to-mint-green text-white text-xs font-bold">
                                            {profile.name.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                                <div className="flex flex-col items-start gap-0.5 text-left hidden sm:flex">
                                    <span className="text-xs font-medium leading-none text-primary">{profile.name}</span>
                                    <span className="text-[10px] text-slate-grey leading-none">Pro Plan</span>
                                </div>
                                <ChevronDown className="h-3 w-3 text-slate-grey/50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 p-2 bg-glass-panel backdrop-blur-xl border-white/10">
                            <DropdownMenuLabel className="px-2 py-1.5">
                                <div className="flex flex-col space-y-1">
                                    <span className="text-sm font-medium leading-none text-primary">{profile.name}</span>
                                    <span className="text-xs text-slate-grey font-normal">
                                        {profile.email || 'operator@neurix.ai'}
                                    </span>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-white/10 my-2" />
                            <DropdownMenuItem onClick={onOpenProfile} className="rounded-lg focus:bg-white/10 text-slate-grey focus:text-primary">
                                <User className="mr-2 h-4 w-4 opacity-70" />
                                Neural Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onOpenSettings} className="rounded-lg focus:bg-white/10 text-slate-grey focus:text-primary">
                                <Settings className="mr-2 h-4 w-4 opacity-70" />
                                System Config
                            </DropdownMenuItem>
                            {onBackToLanding && (
                                <DropdownMenuItem onClick={onBackToLanding} className="rounded-lg focus:bg-white/10 text-slate-grey focus:text-primary">
                                    <Home className="mr-2 h-4 w-4 opacity-70" />
                                    Return to Home
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator className="bg-white/10 my-2" />
                            <DropdownMenuItem
                                className="text-amber-500 focus:text-amber-400 focus:bg-amber-500/10 rounded-lg"
                                onClick={onBackToLanding}
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Disconnect
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}
