import { useRef, useEffect, useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { useServer } from '../../context/ServerContext';
import { CommandInput } from './CommandInput';
import { ScrollToBottom } from './ScrollToBottom';
import { DateSeparator } from './DateSeparator';
import { SuggestionChips } from './SuggestionChips';
import type { Message } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getServerIcon } from '@/lib/server-utils';
import ReactMarkdown from 'react-markdown';
import {
    Copy, Check, RotateCcw, MoreHorizontal,
    Bot, User, Sparkles, AlertTriangle, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

// Typing Indicator
function TypingIndicator() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex items-center gap-3.5 px-4 py-3 max-w-3xl mx-auto"
        >
            <div className="w-8 h-8 rounded-xl bg-neurix-orange/10 dark:bg-neurix-orange/15 flex items-center justify-center shrink-0 border border-neurix-orange/20">
                <Sparkles className="w-4 h-4 text-neurix-orange" />
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
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest ml-1">Thinking</span>
            </div>
        </motion.div>
    );
}

// Message Component
const ChatMessage = ({ msg }: { msg: Message }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async (content: string) => {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        toast.success('Copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
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
                        <p className="text-sm text-red-700 dark:text-red-300/80 leading-relaxed">{msg.content}</p>
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
                    'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1 border transition-colors',
                    msg.role === 'user'
                        ? 'bg-muted dark:bg-white/[0.06] border-border dark:border-white/10 text-muted-foreground'
                        : 'bg-neurix-orange/10 border-neurix-orange/20 text-neurix-orange'
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
                        'relative px-4 py-3 text-sm leading-relaxed transition-colors',
                        msg.role === 'user'
                            ? 'bg-neurix-orange/10 dark:bg-neurix-orange/[0.08] border border-neurix-orange/15 rounded-2xl rounded-tr-md max-w-[85%] text-foreground'
                            : 'bg-muted/50 dark:bg-white/[0.03] border border-border/50 dark:border-white/[0.06] rounded-2xl rounded-tl-md w-full text-foreground'
                    )}
                >
                    {msg.role === 'user' ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
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
                                            <div className="my-3 rounded-xl border border-border dark:border-white/[0.06] bg-muted dark:bg-[#0a0a0f] overflow-hidden">
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

// Empty State - clean and minimal
const EmptyState = ({
    onSelect,
    servers,
}: {
    onSelect: (id: string) => void;
    servers: any[];
}) => {
    return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            {/* Hero */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="relative mb-8"
            >
                <div className="w-20 h-20 rounded-2xl bg-neurix-orange/10 flex items-center justify-center border border-neurix-orange/20">
                    <Bot className="w-10 h-10 text-neurix-orange" />
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
            >
                <h2 className="text-3xl font-heading font-bold text-foreground mb-2 tracking-tight">
                    Neurix <span className="text-neurix-orange">Workstation</span>
                </h2>
                <p className="text-muted-foreground max-w-md mb-10 text-sm leading-relaxed mx-auto">
                    Connect a service below to get started, or type a message to begin a conversation.
                </p>
            </motion.div>

            {/* Server Grid */}
            {servers.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                    className="w-full max-w-lg"
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {servers.slice(0, 4).map((server, i) => {
                            const Icon = getServerIcon(server.id);
                            return (
                                <motion.button
                                    key={server.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.25 + i * 0.05 }}
                                    whileHover={{ y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => onSelect(server.id)}
                                    className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-neurix-orange/30 hover:bg-neurix-orange/[0.03] transition-all group text-left"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-muted dark:bg-white/[0.05] border border-border dark:border-white/[0.06] flex items-center justify-center group-hover:border-neurix-orange/25 group-hover:bg-neurix-orange/10 transition-all text-muted-foreground group-hover:text-neurix-orange">
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="block text-sm font-medium text-foreground">{server.name}</span>
                                        <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground/60 group-hover:text-neurix-orange/60 transition-colors">
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

export function ChatStage() {
    const { isLoading, sendMessage, currentSession } = useChat();
    const { servers, activeServerId, setActiveServerId } = useServer();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const messages = currentSession?.messages || [];
    const lastAiMsg = [...messages].reverse().find((m) => m.role === 'assistant');

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    return (
        <div className="flex-1 flex flex-col h-full relative">
            <div className="flex-1 overflow-hidden relative" ref={scrollAreaRef}>
                <ScrollArea className="h-full">
                    <div className="px-4 py-6 min-h-full flex flex-col">
                        {messages.length === 0 ? (
                            <EmptyState
                                onSelect={(id) => setActiveServerId(id)}
                                servers={Object.values(servers).filter((s) => s.status === 'available')}
                            />
                        ) : (
                            <div className="space-y-6 pb-4">
                                {messages.map((msg, idx) => {
                                    const prevMsg = idx > 0 ? messages[idx - 1] : null;
                                    const showDateSep = idx === 0 || isDifferentDay(prevMsg?.createdAt, msg.createdAt);
                                    return (
                                        <div key={msg.id}>
                                            {showDateSep && msg.createdAt && <DateSeparator dateString={msg.createdAt} />}
                                            <ChatMessage msg={msg} />
                                        </div>
                                    );
                                })}
                                <AnimatePresence>
                                    {!isLoading && lastAiMsg?.suggestions && lastAiMsg.suggestions.length > 0 && (
                                        <SuggestionChips suggestions={lastAiMsg.suggestions} onSelect={(text) => sendMessage(text)} />
                                    )}
                                </AnimatePresence>
                                <AnimatePresence>{isLoading && <TypingIndicator />}</AnimatePresence>
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
