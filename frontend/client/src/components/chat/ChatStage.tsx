import { useRef, useEffect, useState, useMemo } from 'react';
import { useChat } from '../../context/ChatContext';
import { useServer } from '../../context/ServerContext';
import { CommandInput } from './CommandInput';
import { ScrollToBottom } from './ScrollToBottom';
import { DateSeparator } from './DateSeparator';
import { SuggestionChips } from './SuggestionChips';
import type { Message } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getServerIcon, getServerVisual } from '@/lib/server-utils';
import ReactMarkdown from 'react-markdown';
import {
    Copy, Check, RotateCcw, MoreHorizontal,
    Bot, User, Sparkles, AlertTriangle, ArrowRight,
    Search, X, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

// Server-specific starter prompts
const SERVER_PROMPTS: Record<string, { label: string; prompts: string[] }> = {
    gdrive: {
        label: 'Google Drive',
        prompts: ['List my recent files', 'Search for documents', 'Create a new folder'],
    },
    gforms: {
        label: 'Google Forms',
        prompts: ['List my forms', 'Show form responses', 'Search forms'],
    },
    gmail: {
        label: 'Gmail',
        prompts: ['Show unread emails', 'Search my inbox', 'List recent messages'],
    },
    gcalendar: {
        label: 'Google Calendar',
        prompts: ['Show today\'s events', 'List upcoming meetings', 'Check my schedule'],
    },
    gtask: {
        label: 'Google Tasks',
        prompts: ['Show my tasks', 'List task lists', 'Create a new task'],
    },
};

// Typing Indicator with server context
function TypingIndicator({ serverName, serverId }: { serverName?: string; serverId?: string }) {
    const Icon = serverId ? getServerIcon(serverId) : Sparkles;
    const visual = serverId ? getServerVisual(serverId) : null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex items-center gap-3.5 px-4 py-3 max-w-3xl mx-auto"
        >
            <div className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border",
                visual ? `${visual.darkBg} border-current/20` : "bg-neurix-orange/10 dark:bg-neurix-orange/15 border-neurix-orange/20"
            )}>
                <Icon className={cn("w-4 h-4", visual ? "" : "text-neurix-orange")} />
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/50 dark:bg-white/[0.04] border border-border/50">
                <div className="flex items-center gap-1">
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-neurix-orange"
                            animate={{
                                scale: [1, 1.4, 1],
                                opacity: [0.4, 1, 0.4],
                                y: [0, -3, 0],
                            }}
                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                        />
                    ))}
                </div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest ml-1">
                    {serverName ? `${serverName} is thinking` : 'Thinking'}
                </span>
            </div>
        </motion.div>
    );
}

// Message Component
const ChatMessage = ({ msg, searchQuery }: { msg: Message; searchQuery?: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async (content: string) => {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        toast.success('Copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
    };

    // Highlight search matches in text
    const highlightText = (text: string) => {
        if (!searchQuery?.trim()) return text;
        const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const parts = text.split(regex);
        return parts.map((part, i) =>
            regex.test(part) ? (
                <mark key={i} className="bg-neurix-orange/30 text-foreground rounded px-0.5">{part}</mark>
            ) : (
                part
            )
        );
    };

    // Error message
    if (msg.role === 'error') {
        return (
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-3xl mx-auto w-full"
            >
                <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-red-50 dark:bg-red-500/[0.06] border border-red-200 dark:border-red-500/15">
                    <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-mono font-bold text-red-500 dark:text-red-400 uppercase tracking-widest mb-1">Error</p>
                        <p className="text-sm text-red-700 dark:text-red-300/80 leading-relaxed">{highlightText(msg.content)}</p>
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
                'group flex gap-3 max-w-3xl mx-auto w-full',
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            )}
        >
            {/* Avatar */}
            <div
                className={cn(
                    'shrink-0 mt-1 shadow-md transition-all',
                    msg.role === 'user'
                        ? 'icon-circle-orange text-white w-9 h-9'
                        : 'icon-circle text-white w-9 h-9'
                )}
            >
                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>

            {/* Content */}
            <div className={cn('flex-1 min-w-0 flex flex-col', msg.role === 'user' ? 'items-end' : 'items-start')}>
                {/* Meta */}
                <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-widest">
                        {msg.role === 'user' ? 'You' : 'Neurix'}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50 font-mono">{msg.timestamp}</span>
                </div>

                {/* Bubble */}
                <div
                    className={cn(
                        'relative text-[15px] font-sans-body leading-relaxed transition-all duration-300',
                        msg.role === 'user'
                            ? 'chat-bubble-user max-w-[85%] shadow-md'
                            : 'chat-bubble-ai w-full shadow-md'
                    )}
                >
                    {msg.role === 'user' ? (
                        <p className="whitespace-pre-wrap">{highlightText(msg.content)}</p>
                    ) : (
                        <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none">
                            <ReactMarkdown
                                components={{
                                    code(props) {
                                        const { className, children, ...rest } = props;
                                        const isInline = !String(children).includes('\n');
                                        if (isInline) {
                                            return (
                                                <code
                                                    className="bg-neurix-orange/10 text-neurix-orange px-1.5 py-0.5 rounded-md text-xs font-mono border border-neurix-orange/10"
                                                    {...rest}
                                                >
                                                    {children}
                                                </code>
                                            );
                                        }
                                        return (
                                            <div className="my-3 rounded-xl border border-border dark:border-white/[0.06] bg-muted dark:bg-[#381932] overflow-hidden">
                                                <div className="flex items-center justify-between px-4 py-2 bg-muted/80 dark:bg-white/[0.03] border-b border-border dark:border-white/[0.06]">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex gap-1.5">
                                                            <div className="w-2.5 h-2.5 rounded-full bg-red-400/50 dark:bg-red-500/40" />
                                                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/50 dark:bg-yellow-500/40" />
                                                            <div className="w-2.5 h-2.5 rounded-full bg-green-400/50 dark:bg-green-500/40" />
                                                        </div>
                                                        <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider ml-2">
                                                            Code
                                                        </span>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 gap-1.5 text-[10px] text-muted-foreground hover:text-foreground rounded-md"
                                                        onClick={() => handleCopy(String(children))}
                                                    >
                                                        <Copy className="w-3 h-3" /> Copy
                                                    </Button>
                                                </div>
                                                <div className="p-4 overflow-x-auto">
                                                    <code className={cn(className, 'text-xs font-mono text-foreground/80 leading-relaxed')} {...rest}>
                                                        {children}
                                                    </code>
                                                </div>
                                            </div>
                                        );
                                    },
                                    // Table rendering
                                    table({ children }) {
                                        return (
                                            <div className="my-3 overflow-x-auto rounded-xl border border-border dark:border-white/[0.06]">
                                                <table className="w-full text-sm border-collapse">
                                                    {children}
                                                </table>
                                            </div>
                                        );
                                    },
                                    thead({ children }) {
                                        return (
                                            <thead className="bg-muted/80 dark:bg-white/[0.04]">
                                                {children}
                                            </thead>
                                        );
                                    },
                                    tbody({ children }) {
                                        return <tbody className="divide-y divide-border dark:divide-white/[0.06]">{children}</tbody>;
                                    },
                                    tr({ children }) {
                                        return (
                                            <tr className="hover:bg-muted/30 dark:hover:bg-white/[0.02] transition-colors">
                                                {children}
                                            </tr>
                                        );
                                    },
                                    th({ children }) {
                                        return (
                                            <th className="px-4 py-2.5 text-left text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest border-b border-border dark:border-white/[0.06]">
                                                {children}
                                            </th>
                                        );
                                    },
                                    td({ children }) {
                                        return (
                                            <td className="px-4 py-2.5 text-sm text-foreground/80">
                                                {children}
                                            </td>
                                        );
                                    },
                                    hr() {
                                        return <hr className="my-4 border-border dark:border-white/[0.08]" />;
                                    },
                                    p({ children }) {
                                        return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>;
                                    },
                                    ul({ children }) {
                                        return <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>;
                                    },
                                    ol({ children }) {
                                        return <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>;
                                    },
                                    li({ children }) {
                                        return <li className="pl-1 leading-relaxed">{children}</li>;
                                    },
                                    a({ children, href }) {
                                        return (
                                            <a
                                                href={href}
                                                className="text-neurix-orange hover:underline underline-offset-2 transition-colors"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                {children}
                                            </a>
                                        );
                                    },
                                    blockquote({ children }) {
                                        return (
                                            <blockquote className="border-l-2 border-neurix-orange/30 pl-4 italic text-muted-foreground my-3">
                                                {children}
                                            </blockquote>
                                        );
                                    },
                                    strong({ children }) {
                                        return <strong className="font-semibold text-foreground">{children}</strong>;
                                    },
                                    h1({ children }) {
                                        return <h1 className="text-lg font-bold text-foreground mt-4 mb-2">{children}</h1>;
                                    },
                                    h2({ children }) {
                                        return <h2 className="text-base font-bold text-foreground mt-3 mb-2">{children}</h2>;
                                    },
                                    h3({ children }) {
                                        return <h3 className="text-sm font-bold text-foreground mt-3 mb-1.5">{children}</h3>;
                                    },
                                }}
                            >
                                {msg.content}
                            </ReactMarkdown>
                        </div>
                    )}
                </div>

                {/* Actions (AI Only) */}
                {msg.role === 'assistant' && (
                    <div className="flex items-center gap-0.5 mt-1.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-neurix-orange rounded-lg"
                            onClick={() => handleCopy(msg.content)}
                        >
                            {copied ? <Check className="w-3.5 h-3.5 text-mint-green" /> : <Copy className="w-3.5 h-3.5" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-neurix-orange rounded-lg">
                            <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-neurix-orange rounded-lg">
                            <MoreHorizontal className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

// Helper to check if two dates are on different days
function isDifferentDay(d1?: string, d2?: string): boolean {
    if (!d1 || !d2) return false;
    const a = new Date(d1);
    const b = new Date(d2);
    return a.toDateString() !== b.toDateString();
}

// Connected Empty State - shows server-specific prompts
const ConnectedEmptyState = ({
    serverId,
    serverName,
    onSend,
}: {
    serverId: string;
    serverName: string;
    onSend: (text: string) => void;
}) => {
    const Icon = getServerIcon(serverId);
    const visual = getServerVisual(serverId);
    const prompts = SERVER_PROMPTS[serverId]?.prompts || ['Help', 'What can you do?', 'List available tools'];

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="relative mb-6"
            >
                <div className="w-20 h-20 rounded-2xl bg-white/10 dark:bg-white/[0.08] border border-white/20 dark:border-white/10 flex items-center justify-center shadow-lg backdrop-blur-sm">
                    <Icon size={44} />
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
            >
                <h2 className="text-3xl font-serif-display font-medium text-foreground mb-2 tracking-tight">
                    Connected to <span className="text-neurix-orange">{serverName}</span>
                </h2>
                <p className="text-muted-foreground max-w-md mb-8 text-[15px] leading-relaxed mx-auto font-sans-body">
                    Try one of these to get started, or type your own message below.
                </p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="w-full max-w-md"
            >
                <div className="space-y-2.5">
                    {prompts.map((prompt, i) => (
                        <motion.button
                            key={prompt}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.25 + i * 0.06 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onSend(prompt)}
                            className="list-item-hover w-full flex items-center gap-3 p-4 bg-transparent border border-border/10 text-left group"
                        >
                            <div className="icon-circle w-8 h-8 group-hover:bg-neurix-orange transition-colors">
                                <Sparkles className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-[15px] font-sans-body font-medium text-foreground transition-colors">{prompt}</span>
                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-neurix-orange ml-auto transition-colors" />
                        </motion.button>
                    ))}
                </div>
            </motion.div>
        </div>
    );
};

// Disconnected Empty State - shows server grid
const DisconnectedEmptyState = ({
    onSelect,
    servers,
}: {
    onSelect: (id: string) => void;
    servers: any[];
}) => {
    return (
        <div className="flex-1 flex flex-col items-center p-6 pb-4 text-center my-auto">
            {/* Hero */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="relative mb-6 mt-auto"
            >
                <div className="icon-circle w-20 h-20 shadow-[0_8px_30px_rgba(56,25,50,0.15)] relative overflow-hidden group">
                    <div className="absolute inset-0 bg-neurix-gradient opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <Bot className="w-10 h-10 text-white relative z-10" />
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
            >
                <h2 className="text-3xl font-serif-display font-medium text-foreground mb-2 tracking-tight">
                    Neurix <span className="font-semibold text-neurix-orange">Workstation</span>
                </h2>
                <p className="text-muted-foreground max-w-md mb-10 text-[15px] font-sans-body leading-relaxed mx-auto">
                    Connect a service below to get started, or type a message to begin a conversation.
                </p>
            </motion.div>

            {/* Server Grid */}
            {servers.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                    className="w-full max-w-lg mb-auto"
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {servers.slice(0, 6).map((server, i) => {
                            const Icon = getServerIcon(server.id);
                            return (
                                <motion.button
                                    key={server.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.25 + i * 0.05 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => onSelect(server.id)}
                                    className="editorial-card dark:context-card-dark p-4 flex items-center gap-4 text-left group hover:scale-[1.02] transition-all"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center group-hover:bg-white/[0.1] transition-colors duration-300">
                                        <Icon size={22} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="block text-[15px] font-sans-body font-semibold text-foreground group-hover:text-neurix-orange transition-colors">{server.name}</span>
                                        <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-muted-foreground group-hover:text-neurix-orange/80 uppercase tracking-widest transition-colors mt-1">
                                            Connect <ArrowRight className="w-3 h-3" />
                                        </span>
                                    </div>
                                </motion.button>
                            );
                        })}
                    </div>
                </motion.div>
            )}
        </div>
    );
};

// Search bar component
function ChatSearchBar({
    searchQuery,
    onSearchChange,
    onClose,
    matchCount,
}: {
    searchQuery: string;
    onSearchChange: (q: string) => void;
    onClose: () => void;
    matchCount: number;
}) {
    return (
        <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-b border-border"
        >
            <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/30 dark:bg-white/[0.02]">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                    type="text"
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search messages..."
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none font-mono"
                />
                {searchQuery && (
                    <span className="text-[10px] font-mono text-muted-foreground/60 px-2 py-0.5 bg-muted/50 rounded-md">
                        {matchCount} {matchCount === 1 ? 'match' : 'matches'}
                    </span>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground shrink-0"
                    onClick={onClose}
                >
                    <X className="w-3.5 h-3.5" />
                </Button>
            </div>
        </motion.div>
    );
}

export function ChatStage() {
    const { isLoading, sendMessage, currentSession } = useChat();
    const { servers, activeServerId, setActiveServerId, connectServer } = useServer();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const messages = currentSession?.messages || [];
    const lastAiMsg = [...messages].reverse().find((m) => m.role === 'assistant');

    // Active server info
    const activeServer = activeServerId ? servers[activeServerId] : null;

    // Filter messages by search query
    const filteredMessages = useMemo(() => {
        if (!searchQuery.trim()) return messages;
        const q = searchQuery.toLowerCase();
        return messages.filter((m) => m.content.toLowerCase().includes(q));
    }, [messages, searchQuery]);

    const matchCount = searchQuery.trim() ? filteredMessages.length : 0;

    // Keyboard shortcut for search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'f' && messages.length > 0) {
                e.preventDefault();
                setShowSearch(true);
            }
            if (e.key === 'Escape' && showSearch) {
                setShowSearch(false);
                setSearchQuery('');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showSearch, messages.length]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // Determine which empty state to show
    const hasConnectedServer = activeServer?.connected;

    const displayMessages = searchQuery.trim() ? filteredMessages : messages;

    return (
        <div className="flex-1 flex flex-col h-full relative">
            {/* Search Bar */}
            <AnimatePresence>
                {showSearch && (
                    <ChatSearchBar
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        onClose={() => { setShowSearch(false); setSearchQuery(''); }}
                        matchCount={matchCount}
                    />
                )}
            </AnimatePresence>

            <div className="flex-1 overflow-hidden relative" ref={scrollAreaRef}>
                {/* Search toggle button */}
                {messages.length > 0 && !showSearch && (
                    <div className="absolute top-3 right-3 z-10">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-muted-foreground/50 hover:text-foreground bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm"
                            onClick={() => setShowSearch(true)}
                            title="Search messages (Ctrl+F)"
                        >
                            <Search className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                )}

                <ScrollArea className="h-full">
                    <div className="px-4 pt-6 pb-2 min-h-full flex flex-col">
                        {messages.length === 0 ? (
                            hasConnectedServer && activeServerId ? (
                                <ConnectedEmptyState
                                    serverId={activeServerId}
                                    serverName={activeServer!.name}
                                    onSend={sendMessage}
                                />
                            ) : (
                                <DisconnectedEmptyState
                                    onSelect={(id) => connectServer(id)}
                                    servers={Object.values(servers).filter((s) => s.status === 'available')}
                                />
                            )
                        ) : (
                            <div className="space-y-6 pb-4">
                                {displayMessages.map((msg, idx) => {
                                    const prevMsg = idx > 0 ? displayMessages[idx - 1] : null;
                                    const showDateSep = idx === 0 || isDifferentDay(prevMsg?.createdAt, msg.createdAt);
                                    return (
                                        <div key={msg.id}>
                                            {showDateSep && msg.createdAt && <DateSeparator dateString={msg.createdAt} />}
                                            <ChatMessage msg={msg} searchQuery={searchQuery} />
                                        </div>
                                    );
                                })}
                                <AnimatePresence>
                                    {!isLoading && lastAiMsg?.suggestions && lastAiMsg.suggestions.length > 0 && (
                                        <SuggestionChips suggestions={lastAiMsg.suggestions} onSelect={(text) => sendMessage(text)} />
                                    )}
                                </AnimatePresence>
                                <AnimatePresence>
                                    {isLoading && (
                                        <TypingIndicator
                                            serverName={activeServer?.name}
                                            serverId={activeServerId || undefined}
                                        />
                                    )}
                                </AnimatePresence>
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <ScrollToBottom scrollRef={scrollAreaRef} messagesEndRef={messagesEndRef} />
            </div>

            <div className="shrink-0 z-20 w-full">
                <CommandInput onSend={sendMessage} isLoading={isLoading} />
            </div>
        </div>
    );
}
