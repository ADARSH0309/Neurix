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
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-40">
            <div className="h-full px-6 flex items-center justify-between gap-6">
                {/* Left Section */}
                <div className="flex items-center gap-4">
                    {/* Mobile Menu */}
                    <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 rounded-lg" onClick={onToggleSidebar}>
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

                    {/* Divider */}
                    <div className="hidden md:block w-px h-8 bg-border" />

                    {/* Connection Status */}
                    <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-muted/50 border border-border">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-medium text-muted-foreground uppercase tracking-widest">Sys.Status</span>
                            <div className="relative w-20 h-1.5 bg-muted dark:bg-black/40 rounded-full overflow-hidden">
                                <div
                                    className={cn(
                                        "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
                                        neuralIntegrity >= 100
                                            ? "bg-mint-green"
                                            : neuralIntegrity >= 50
                                                ? "bg-neurix-orange"
                                                : "bg-amber-500"
                                    )}
                                    style={{ width: `${neuralIntegrity}%` }}
                                />
                            </div>
                            <span className={cn(
                                "text-[10px] font-mono font-bold tabular-nums",
                                neuralIntegrity >= 100 ? "text-mint-green"
                                    : neuralIntegrity >= 50 ? "text-neurix-orange"
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
                            searchFocused ? "text-neurix-orange" : "text-muted-foreground/50 group-hover:text-muted-foreground"
                        )} />
                        <input
                            type="text"
                            placeholder="Search neural memory..."
                            onFocus={() => setSearchFocused(true)}
                            onBlur={() => setSearchFocused(false)}
                            className={cn(
                                "w-full h-11 pl-11 pr-16 bg-muted/50 dark:bg-black/20 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none transition-all",
                                "focus:bg-muted dark:focus:bg-black/40 focus:border-neurix-orange/30 focus:ring-1 focus:ring-neurix-orange/20",
                                "hover:bg-muted/80 dark:hover:bg-black/30 hover:border-border"
                            )}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 rounded-md bg-muted dark:bg-white/5 border border-border text-muted-foreground/50">
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
                            <Button variant="ghost" size="icon" className="h-10 w-10 relative rounded-xl transition-all">
                                <Bell className="h-5 w-5 text-muted-foreground" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-neurix-orange rounded-full ring-2 ring-background animate-pulse" />
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
                                <span className="text-sm font-semibold font-heading tracking-wide">Notifications</span>
                                {unreadCount > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs gap-1 text-muted-foreground hover:text-neurix-orange"
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
                                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                                            <Bell className="w-5 h-5 text-muted-foreground/30" />
                                        </div>
                                        <p className="text-sm text-muted-foreground">No new signals</p>
                                    </div>
                                ) : (
                                    activities.slice(0, 15).map((item) => {
                                        const IconComp = getActivityIcon(item.type);
                                        return (
                                            <div
                                                key={item.id}
                                                className={cn(
                                                    "flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border last:border-0",
                                                    !item.read && "bg-neurix-orange/5"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border border-border",
                                                    item.server === 'gdrive' ? "bg-blue-500/10 text-blue-500 dark:text-blue-400" : "bg-neurix-orange/10 text-neurix-orange"
                                                )}>
                                                    <IconComp className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0 space-y-0.5">
                                                    <p className="text-sm text-foreground leading-tight">{item.action}</p>
                                                    <p className="text-xs text-muted-foreground font-mono">{item.serverName} &middot; {item.time}</p>
                                                </div>
                                                {!item.read && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-neurix-orange shrink-0 mt-2" />
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </ScrollArea>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Settings */}
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-muted-foreground hover:text-foreground" onClick={onOpenSettings}>
                        <Settings className="h-5 w-5" />
                    </Button>

                    {/* User Menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="gap-3 pl-2 pr-3 h-10 ml-2 rounded-xl border border-transparent hover:border-border transition-all">
                                <div className="h-7 w-7 rounded-lg overflow-hidden ring-1 ring-border">
                                    <Avatar className="h-full w-full">
                                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.name}`} />
                                        <AvatarFallback className="bg-gradient-to-br from-neurix-orange to-neurix-orange-light text-white text-xs font-bold">
                                            {profile.name.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                                <div className="flex flex-col items-start gap-0.5 text-left hidden sm:flex">
                                    <span className="text-xs font-medium leading-none text-foreground">{profile.name}</span>
                                    <span className="text-[10px] text-muted-foreground leading-none">Pro Plan</span>
                                </div>
                                <ChevronDown className="h-3 w-3 text-muted-foreground/50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 p-2">
                            <DropdownMenuLabel className="px-2 py-1.5">
                                <div className="flex flex-col space-y-1">
                                    <span className="text-sm font-medium leading-none">{profile.name}</span>
                                    <span className="text-xs text-muted-foreground font-normal">
                                        {profile.email || 'operator@neurix.ai'}
                                    </span>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator className="my-2" />
                            <DropdownMenuItem onClick={onOpenProfile} className="rounded-lg">
                                <User className="mr-2 h-4 w-4 opacity-70" />
                                Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onOpenSettings} className="rounded-lg">
                                <Settings className="mr-2 h-4 w-4 opacity-70" />
                                Settings
                            </DropdownMenuItem>
                            {onBackToLanding && (
                                <DropdownMenuItem onClick={onBackToLanding} className="rounded-lg">
                                    <Home className="mr-2 h-4 w-4 opacity-70" />
                                    Home
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator className="my-2" />
                            <DropdownMenuItem
                                className="text-amber-600 dark:text-amber-500 focus:text-amber-700 dark:focus:text-amber-400 focus:bg-amber-50 dark:focus:bg-amber-500/10 rounded-lg"
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
