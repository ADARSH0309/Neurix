import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
    Send,
    Bot,
    User,
    Paperclip,
    Copy,
    Check,
    RotateCcw,
    Code,
    FileText,
    Mic,
    MoreHorizontal,
    Terminal,
    ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message, McpServer, UserProfile } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { getServerIcon } from '@/lib/server-utils';

interface ChatAreaProps {
    activeServer: McpServer | null;
    servers: Record<string, McpServer>;
    activeServerId: string | null;
    onSelectServer: (serverId: string) => void;
    messages: Message[];
    onSendMessage: (text: string) => void;
    isLoading: boolean;
    profile: UserProfile;
    isToolsPanelOpen?: boolean;
    onToggleToolsPanel?: () => void;
    compactMode?: boolean;
    sessionTitle?: string;
    sessionId?: string | null;
    onRenameSession?: (sessionId: string, newTitle: string) => void;
}

// --- Minimalist Typing Indicator ---
function TypingIndicator(): React.ReactElement {
    return (
        <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
        >
            <div className="w-8 h-8 rounded bg-electric-purple/10 flex items-center justify-center shrink-0">
                <div className="font-bold text-electric-purple text-xs">N</div>
            </div>
            <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                    <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-slate-grey/40"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                    />
                ))}
            </div>
        </motion.div>
    );
}

export function ChatArea({
    activeServer,
    servers,
    activeServerId,
    onSelectServer,
    messages,
    onSendMessage,
    isLoading,
    profile,
}: ChatAreaProps): React.ReactElement {
    const [input, setInput] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = (): void => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => { scrollToBottom(); }, [messages, isLoading]);

    const handleSubmit = (e?: React.FormEvent): void => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;
        onSendMessage(input);
        setInput('');
        if (inputRef.current) inputRef.current.style.height = 'auto'; // Reset height
    };

    const handleKeyDown = (e: React.KeyboardEvent): void => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleCopy = async (content: string, id: string): Promise<void> => {
        await navigator.clipboard.writeText(content);
        setCopiedId(id);
        toast('Copied to clipboard');
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Empty State
    if (messages.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-obsidian relative">
                <div className="text-center space-y-6 max-w-md px-6">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-[#1F2937] flex items-center justify-center mb-4">
                        <Terminal className="w-8 h-8 text-electric-purple" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-semibold text-white mb-2">
                            Hello, <span className="text-electric-purple">{profile.name}</span>
                        </h2>
                        <p className="text-slate-grey text-sm leading-relaxed">
                            {activeServer
                                ? `Connected to ${activeServer.name}. System ready.`
                                : 'Select a neural node to begin operations.'}
                        </p>
                    </div>

                    {!activeServer && (
                        <div className="grid grid-cols-2 gap-3 mt-8">
                            {Object.values(servers).filter(s => s.status === 'available').slice(0, 4).map(server => {
                                const Icon = getServerIcon(server.id);
                                return (
                                    <button
                                        key={server.id}
                                        onClick={() => onSelectServer(server.id)}
                                        className="flex items-center gap-3 p-3 rounded-lg border border-[#1F2937] hover:bg-[#1F2937] hover:border-electric-purple/30 transition-all text-left group"
                                    >
                                        <div className="p-1.5 rounded bg-[#0F1115] text-slate-grey group-hover:text-electric-purple transition-colors">
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-medium text-white">{server.name}</span>
                                            <span className="text-[10px] text-slate-grey">Connect</span>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>
                {/* Floating Input for Empty State */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-electric-purple/20 to-mint-green/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative bg-[#15171C] border border-[#1F2937] rounded-full flex items-center p-1.5 shadow-2xl">
                            <div className="pl-4 pr-2">
                                <Paperclip className="w-5 h-5 text-slate-grey hover:text-white cursor-pointer transition-colors" />
                            </div>
                            <input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={!activeServer}
                                placeholder={activeServer ? "Ask anything..." : "Select a server first..."}
                                className="flex-1 bg-transparent border-0 outline-none text-sm text-white placeholder:text-slate-grey/50 py-3"
                            />
                            <Button
                                onClick={() => handleSubmit()}
                                disabled={!input.trim() || isLoading || !activeServer}
                                size="icon"
                                className="h-9 w-9 rounded-full bg-electric-purple hover:bg-electric-purple/90 text-white shrink-0 ml-2"
                            >
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="flex-1 flex flex-col h-full bg-obsidian relative">
                {/* Header */}
                <header className="h-14 border-b border-[#1F2937] flex items-center justify-between px-6 shrink-0 bg-obsidian/95 backdrop-blur z-20">
                    <div className="flex items-center gap-3">
                        <h1 className="text-sm font-medium text-white tracking-wide">
                            {activeServer?.name || 'Neurix Terminal'}
                        </h1>
                        {activeServer?.connected && (
                            <span className="text-[10px] font-mono text-mint-green px-1.5 py-0.5 rounded bg-mint-green/10">
                                ACTIVE
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-grey font-mono">
                            session-id: {messages[0]?.id.slice(0, 8) || 'init'}
                        </span>
                    </div>
                </header>

                <ScrollArea className="flex-1 px-4 py-6">
                    <div className="max-w-3xl mx-auto space-y-8 pb-4">
                        {messages.map((msg) => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={cn(
                                    "flex gap-4 group",
                                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                                )}
                            >
                                {/* Avatar */}
                                <div className={cn(
                                    "w-8 h-8 rounded flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs select-none",
                                    msg.role === 'user'
                                        ? "bg-[#1F2937] text-slate-grey"
                                        : "bg-electric-purple text-white shadow-[0_0_15px_-3px_rgba(139,92,246,0.5)]"
                                )}>
                                    {msg.role === 'user' ? 'U' : 'N'}
                                </div>

                                <div className={cn(
                                    "flex-1 max-w-[85%] space-y-2",
                                    msg.role === 'user' ? "text-right" : "text-left"
                                )}>
                                    <div className={cn(
                                        "flex items-center gap-2 text-[10px] font-mono text-slate-grey/60 uppercase tracking-widest",
                                        msg.role === 'user' ? "justify-end" : "justify-start"
                                    )}>
                                        <span>{msg.role === 'user' ? 'User Input' : 'Neurix Output'}</span>
                                        <span>•</span>
                                        <span>{msg.timestamp}</span>
                                    </div>

                                    <div className={cn(
                                        "text-sm leading-7 font-sans",
                                        msg.role === 'user' ? "text-white/90 bg-[#1F2937]/50 px-4 py-2 rounded-2xl rounded-tr-sm" : "text-slate-grey"
                                    )}>
                                        {msg.role === 'user' ? (
                                            <p className="whitespace-pre-wrap">{msg.content}</p>
                                        ) : (
                                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                                <ReactMarkdown
                                                    components={{
                                                        code(props) {
                                                            const { className, children, ...rest } = props;
                                                            const isInline = !String(children).includes('\n');
                                                            if (isInline) {
                                                                return <code className="bg-[#1F2937] text-mint-green px-1.5 py-0.5 rounded text-xs font-mono border border-white/5" {...rest}>{children}</code>;
                                                            }
                                                            return (
                                                                <div className="my-4 rounded-lg border border-[#1F2937] bg-[#050505] overflow-hidden">
                                                                    <div className="flex items-center justify-between px-4 py-2 bg-[#15171C] border-b border-[#1F2937]">
                                                                        <div className="flex items-center gap-2">
                                                                            <FileText className="w-3.5 h-3.5 text-electric-purple" />
                                                                            <span className="text-xs font-mono text-slate-grey">script.py</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-[10px] text-slate-grey font-mono uppercase">Python</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="p-4 overflow-x-auto">
                                                                        <code className={cn(className, "text-xs font-mono text-white")} {...rest}>
                                                                            {children}
                                                                        </code>
                                                                    </div>
                                                                    <div className="px-3 py-2 border-t border-[#1F2937] bg-[#15171C] flex justify-end">
                                                                        <Button variant="ghost" size="sm" className="h-6 text-[10px] text-slate-grey hover:text-white" onClick={() => handleCopy(String(children), msg.id)}>
                                                                            <Copy className="w-3 h-3 mr-1" /> Copy Code
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        },
                                                        p({ children }) { return <p className="mb-3 last:mb-0">{children}</p>; },
                                                        ul({ children }) { return <ul className="list-disc list-inside space-y-1 mb-3 marker:text-mint-green">{children}</ul>; },
                                                    }}
                                                >
                                                    {msg.content}
                                                </ReactMarkdown>
                                            </div>
                                        )}
                                    </div>
                                    {/* Action Buttons for AI */}
                                    {msg.role === 'assistant' && (
                                        <div className="flex items-center gap-1 mt-1">
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-grey hover:text-white" onClick={() => handleCopy(msg.content, msg.id)}>
                                                {copiedId === msg.id ? <Check className="w-3 h-3 text-mint-green" /> : <Copy className="w-3 h-3" />}
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-grey hover:text-white">
                                                <RotateCcw className="w-3 h-3" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-grey hover:text-white">
                                                <MoreHorizontal className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                        {isLoading && <TypingIndicator />}
                        <div ref={messagesEndRef} />
                    </div>
                </ScrollArea>

                {/* Floating Input Area (Pill) */}
                <div className="p-6 shrink-0 z-20">
                    <div className="max-w-2xl mx-auto relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-electric-purple/10 to-mint-green/10 rounded-[28px] blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative bg-[#0F1115] border border-[#1F2937] rounded-[28px] flex items-end p-2 shadow-2xl transition-all focus-within:border-electric-purple/50">
                            <div className="pb-2.5 pl-3 pr-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-[#1F2937] text-slate-grey hover:text-white">
                                            <Paperclip className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                </DropdownMenu>
                            </div>
                            <Textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={activeServer ? "Ask anything..." : "Select a server first..."}
                                disabled={!activeServer && messages.length > 0} // Only disable if no server and not empty state (handled above)
                                className="flex-1 min-h-[44px] max-h-32 resize-none border-0 bg-transparent py-3 px-2 text-sm text-white placeholder:text-slate-grey/50 focus-visible:ring-0"
                                rows={1}
                                onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = 'auto';
                                    target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
                                }}
                            />
                            <div className="pb-1.5 pr-1.5 flex gap-1">
                                {input.trim() ? (
                                    <Button
                                        onClick={() => handleSubmit()}
                                        disabled={isLoading}
                                        size="icon"
                                        className="h-8 w-8 rounded-full bg-electric-purple hover:bg-electric-purple/90 text-white shadow-lg shadow-electric-purple/20 transition-all"
                                    >
                                        <Send className="w-4 h-4" />
                                    </Button>
                                ) : (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-[#1F2937] text-slate-grey hover:text-white">
                                        <Mic className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="text-center mt-3">
                            <p className="text-[10px] text-slate-grey/30 font-mono">NEURIX v2.0 • AI-POWERED WORKSTATION</p>
                        </div>
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}

