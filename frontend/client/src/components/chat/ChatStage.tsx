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
    Search, X, Zap, FolderOpen, FileSearch, FolderPlus,
    ListChecks, ClipboardList, BarChart3,
    Mail, Inbox, MessageSquare as MailIcon,
    CalendarDays, CalendarClock, CalendarCheck,
    CheckSquare, ListTodo, PlusCircle, Share2, BrainCircuit,
    Table, FileSpreadsheet, PenLine, Grid3X3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

// Server-specific starter prompts with icons and descriptions
const SERVER_PROMPTS: Record<string, { label: string; prompts: { text: string; desc: string; icon: React.ElementType }[] }> = {
    gdrive: {
        label: 'Google Drive',
        prompts: [
            { text: 'List recent files', desc: 'Shows the last documents you modified across all folders.', icon: FolderOpen },
            { text: 'Search for documents', desc: 'Find files by name, type, or content in your Drive.', icon: FileSearch },
            { text: 'Audit sharing', desc: 'Review files with sharing permissions and access levels.', icon: Share2 },
            { text: 'Smart organize', desc: 'AI-suggested folder structures based on file content.', icon: BrainCircuit },
        ],
    },
    gforms: {
        label: 'Google Forms',
        prompts: [
            { text: 'List my forms', desc: 'View all forms you\'ve created with response counts.', icon: ListChecks },
            { text: 'Show form responses', desc: 'Get the latest responses from your forms.', icon: ClipboardList },
            { text: 'Search forms', desc: 'Find forms by title or description.', icon: FileSearch },
            { text: 'Form analytics', desc: 'View response trends and completion rates.', icon: BarChart3 },
        ],
    },
    gmail: {
        label: 'Gmail',
        prompts: [
            { text: 'Show unread emails', desc: 'List all unread messages in your inbox.', icon: Mail },
            { text: 'Search my inbox', desc: 'Find emails by sender, subject, or content.', icon: Inbox },
            { text: 'List recent messages', desc: 'View your latest email conversations.', icon: MailIcon },
            { text: 'Check starred', desc: 'Show all messages you\'ve starred for follow-up.', icon: Sparkles },
        ],
    },
    gcalendar: {
        label: 'Google Calendar',
        prompts: [
            { text: 'Show today\'s events', desc: 'View all events scheduled for today.', icon: CalendarDays },
            { text: 'List upcoming meetings', desc: 'See your meetings for the next 7 days.', icon: CalendarClock },
            { text: 'Check my schedule', desc: 'Overview of your calendar availability.', icon: CalendarCheck },
            { text: 'Find free time', desc: 'Check available slots in your schedule.', icon: Search },
        ],
    },
    gtask: {
        label: 'Google Tasks',
        prompts: [
            { text: 'Show my tasks', desc: 'View all pending tasks in your default list.', icon: CheckSquare },
            { text: 'List task lists', desc: 'View all your task lists and counts.', icon: ListTodo },
            { text: 'Create a new task', desc: 'Add a task with title, notes, and due date.', icon: PlusCircle },
            { text: 'Complete tasks', desc: 'Mark tasks as done or review completed items.', icon: Check },
        ],
    },
    gsheets: {
        label: 'Google Sheets',
        prompts: [
            { text: 'List my spreadsheets', desc: 'View your recent Google Sheets files.', icon: FileSpreadsheet },
            { text: 'Read a sheet', desc: 'Read cell values from a spreadsheet range.', icon: Table },
            { text: 'Create a spreadsheet', desc: 'Create a new blank spreadsheet.', icon: PlusCircle },
            { text: 'Write to cells', desc: 'Update cell values in a range.', icon: PenLine },
        ],
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
const ChatMessage = ({ msg, searchQuery, onRetry }: { msg: Message; searchQuery?: string; onRetry?: () => void }) => {
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
                    'shrink-0 mt-1 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all',
                    msg.role === 'user'
                        ? 'bg-primary text-white'
                        : 'bg-neurix-orange/90 text-white'
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
                                            <div className="my-3 rounded-xl border border-border dark:border-white/[0.06] bg-muted dark:bg-black/30 overflow-hidden">
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
                            className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
                            onClick={() => handleCopy(msg.content)}
                            title="Copy response"
                        >
                            {copied ? <Check className="w-3.5 h-3.5 text-mint-green" /> : <Copy className="w-3.5 h-3.5" />}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
                            onClick={onRetry}
                            title="Retry"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
                            onClick={() => {
                                const plain = msg.content.replace(/[#*_`~>\-\[\]()!|]/g, '').replace(/\n{3,}/g, '\n\n').trim();
                                handleCopy(plain);
                            }}
                            title="Copy as plain text"
                        >
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

// Connected Empty State - shows server-specific prompts in 2x2 grid
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
    const defaultPrompts = [
        { text: 'Help', desc: 'See what I can do for you.', icon: Sparkles },
        { text: 'What can you do?', desc: 'List available capabilities.', icon: Zap },
        { text: 'List available tools', desc: 'Show all tools for this service.', icon: ListTodo },
        { text: 'Get started', desc: 'Quick overview and setup guide.', icon: ArrowRight },
    ];
    const prompts = SERVER_PROMPTS[serverId]?.prompts || defaultPrompts;

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center overflow-y-auto">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="relative mb-2"
            >
                <div className="w-11 h-11 rounded-xl bg-muted/50 dark:bg-white/[0.08] border border-border dark:border-white/10 flex items-center justify-center shadow-lg backdrop-blur-sm">
                    <Icon size={24} />
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
            >
                <h2 className="text-lg font-heading font-bold text-foreground mb-0.5 tracking-tight">
                    Connected to <span className="text-neurix-orange">{serverName}</span>
                </h2>
                <p className="text-muted-foreground max-w-lg mb-4 text-xs leading-relaxed mx-auto">
                    Try one of these actions or type your own request below.
                </p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="w-full max-w-xl"
            >
                <div className="grid grid-cols-2 gap-2">
                    {prompts.slice(0, 4).map((prompt, i) => {
                        const PromptIcon = prompt.icon;
                        return (
                            <motion.button
                                key={prompt.text}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.25 + i * 0.06 }}
                                whileTap={{ scale: 0.98 }}
                                whileHover={{ scale: 1.02 }}
                                onClick={() => onSend(prompt.text)}
                                className="group text-left px-3 py-2.5 rounded-xl border border-border hover:border-primary/30 dark:hover:border-electric-purple/30 bg-card hover:shadow-md transition-all duration-300"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-primary/8 dark:bg-electric-purple/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 dark:group-hover:bg-electric-purple/20 transition-colors">
                                        <PromptIcon className="w-3.5 h-3.5 text-primary dark:text-electric-purple" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-xs font-semibold text-foreground leading-tight">{prompt.text}</h3>
                                        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 line-clamp-1">{prompt.desc}</p>
                                    </div>
                                </div>
                            </motion.button>
                        );
                    })}
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
        <div className="flex-1 flex flex-col items-center p-6 pb-4 text-center justify-center overflow-y-auto">
            {/* Hero */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="relative mb-4"
            >
                <div className="icon-circle w-16 h-16 shadow-[0_8px_30px_rgba(15,5,29,0.15)] relative overflow-hidden group">
                    <div className="absolute inset-0 bg-neurix-gradient opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <Bot className="w-8 h-8 text-white relative z-10" />
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
            >
                <h2 className="text-2xl font-serif-display font-medium text-foreground mb-1.5 tracking-tight">
                    Neurix <span className="font-semibold text-neurix-orange">Workstation</span>
                </h2>
                <p className="text-muted-foreground max-w-md mb-6 text-sm font-sans-body leading-relaxed mx-auto">
                    Connect a service below to get started, or type a message to begin a conversation.
                </p>
            </motion.div>

            {/* Server Grid */}
            {servers.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                    className="w-full max-w-2xl"
                >
                    <div className="flex flex-wrap justify-center gap-3">
                        {servers.slice(0, 6).map((server, i) => {
                            const Icon = getServerIcon(server.id);
                            return (
                                <motion.button
                                    key={server.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.25 + i * 0.05 }}
                                    whileTap={{ scale: 0.98 }}
                                    whileHover={{ scale: 1.02 }}
                                    onClick={() => onSelect(server.id)}
                                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-border hover:border-primary/30 dark:hover:border-electric-purple/30 bg-card text-left group hover:shadow-md transition-all duration-300"
                                >
                                    <div className="w-9 h-9 rounded-lg bg-muted/50 dark:bg-white/[0.06] border border-border/50 dark:border-white/[0.1] flex items-center justify-center shrink-0 group-hover:bg-primary/10 dark:group-hover:bg-white/[0.1] transition-colors duration-300">
                                        <Icon size={18} />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[13px] font-semibold text-foreground group-hover:text-neurix-orange transition-colors leading-tight">{server.name}</span>
                                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground group-hover:text-neurix-orange/80 transition-colors leading-tight">
                                            Connect <ArrowRight className="w-2.5 h-2.5" />
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
    const { isLoading, sendMessage, currentSession, streamingContent } = useChat();
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
                                    // Find the user message that preceded this assistant message for retry
                                    const userMsgBefore = msg.role === 'assistant' && prevMsg?.role === 'user' ? prevMsg : null;
                                    return (
                                        <div key={msg.id}>
                                            {showDateSep && msg.createdAt && <DateSeparator dateString={msg.createdAt} />}
                                            <ChatMessage
                                                msg={msg}
                                                searchQuery={searchQuery}
                                                onRetry={userMsgBefore ? () => sendMessage(userMsgBefore.content) : undefined}
                                            />
                                        </div>
                                    );
                                })}
                                <AnimatePresence>
                                    {!isLoading && lastAiMsg?.suggestions && lastAiMsg.suggestions.length > 0 && (
                                        <SuggestionChips suggestions={lastAiMsg.suggestions} onSelect={(text) => sendMessage(text)} />
                                    )}
                                </AnimatePresence>
                                <AnimatePresence>
                                    {isLoading && streamingContent !== null && streamingContent.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            className="flex justify-start"
                                        >
                                            <ChatMessage
                                                msg={{
                                                    id: '__streaming__',
                                                    role: 'assistant',
                                                    content: streamingContent,
                                                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                                }}
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                <AnimatePresence>
                                    {isLoading && (streamingContent === null || streamingContent.length === 0) && (
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
