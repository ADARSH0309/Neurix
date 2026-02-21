import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
    Send,
    Terminal,
    Paperclip,
    Copy,
    Check,
    RotateCcw,
    MoreHorizontal,
    FileText,
    Mic,
    Bot,
    User,
    Sparkles
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

import { useChat } from '@/context/ChatContext';
import { useServer } from '@/context/ServerContext';
import { useUI } from '@/context/UIContext';

// --- Nebula UI Components ---

// --- Neurix AI Reference UI Components ---

function TypingIndicator(): React.ReactElement {
    return (
        <div className="flex space-x-1.5 py-1.5 items-center">
            <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce"></div>
            <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:200ms]"></div>
            <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:400ms]"></div>
        </div>
    );
}

export function ChatArea(): React.ReactElement {
    const { currentSession, sendMessage, isLoading } = useChat();
    const { servers, activeServerId, setActiveServerId } = useServer();
    const { profile, setIsToolsPanelOpen, isToolsPanelOpen } = useUI();

    const activeServer = activeServerId ? servers[activeServerId] : null;
    const messages = currentSession?.messages || [];
    const onSelectServer = setActiveServerId;
    const onSendMessage = sendMessage;
    const onToggleToolsPanel = () => setIsToolsPanelOpen(!isToolsPanelOpen);

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
        if (inputRef.current) inputRef.current.style.height = 'auto';
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

    const adjustHeight = () => {
        const textarea = inputRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`;
        }
    };

    useEffect(() => {
        adjustHeight();
    }, [input]);

    // Empty State - Neurix AI Reference Style
    if (messages.length === 0) {
        return (
            <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
                {/* Background Effect */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-background to-background opacity-50 pointer-events-none" />

                <div className="flex-1 flex flex-col items-center justify-center text-center max-w-xl mx-auto py-10 px-6 relative z-10 animate-in fade-in zoom-in duration-500">
                    <div className="relative mb-8 group">
                        <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full animate-pulse"></div>
                        <div className="relative w-24 h-24 rounded-[2rem] bg-background border border-white/5 flex items-center justify-center text-5xl shadow-2xl transition-transform group-hover:scale-105 duration-700">
                            {activeServer ? (
                                (() => {
                                    const Icon = getServerIcon(activeServer.id);
                                    return <Icon className="w-10 h-10 text-primary" />;
                                })()
                            ) : (
                                <Terminal className="w-10 h-10 text-primary animate-pulse-slow" />
                            )}
                        </div>
                    </div>

                    <h1 className="text-3xl font-black tracking-tighter uppercase mb-4 italic text-foreground">
                        {activeServer ? 'Enclave Assigned' : 'Neurix Terminal'}
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium leading-relaxed tracking-tight mb-10 max-w-sm">
                        {activeServer ? (
                            <>Current bridge established to the <span className="text-indigo-500 font-bold uppercase">{activeServer.name}</span> MCP. Operational parameters are synchronized.</>
                        ) : (
                            'Select a neural node to initialize uplink operations.'
                        )}
                    </p>

                    {!activeServer ? (
                        <div className="grid grid-cols-2 gap-4 w-full">
                            {Object.values(servers).filter(s => s.status === 'available').slice(0, 4).map((server, i) => {
                                const Icon = getServerIcon(server.id);
                                return (
                                    <motion.button
                                        key={server.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        onClick={() => onSelectServer(server.id)}
                                        className="flex items-center gap-3 p-4 rounded-xl border border-white/5 hover:border-indigo-500/30 bg-white/[0.02] hover:bg-white/5 transition-all group text-left"
                                    >
                                        <div className="p-2 rounded-lg bg-white/5 text-primary group-hover:scale-110 transition-transform">
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-foreground">{server.name}</span>
                                            <span className="text-[10px] font-mono text-muted-foreground uppercase">Connect</span>
                                        </div>
                                    </motion.button>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
                            {[
                                `Status inquiry: ${activeServer.name}`,
                                `Execute protocol audit`,
                                `List active directory`,
                                `Initialize optimized workflow`
                            ].map((p, i) => (
                                <motion.button
                                    key={p}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    onClick={() => onSendMessage(p)}
                                    className="p-4 border rounded-2xl text-left transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-between group bg-white/[0.02] border-white/5 text-muted-foreground hover:border-indigo-500/30 hover:text-white"
                                >
                                    <span className="truncate pr-4">{p}</span>
                                    <Send className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                </motion.button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Floating Input for Empty State */}
                <div className="absolute bottom-0 left-0 right-0 p-6 z-20 bg-gradient-to-t from-background via-background/90 to-transparent pt-20">
                    <div className="max-w-3xl mx-auto w-full">
                        <div className="backdrop-blur-3xl border rounded-[2.5rem] p-1.5 shadow-2xl ring-1 bg-[#0b0f1a]/80 border-white/10 ring-white/5 transition-all focus-within:ring-indigo-500/50">
                            <div className="flex items-end px-3 py-1 space-x-1">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <div className="p-3.5 text-muted-foreground hover:text-indigo-400 transition-all cursor-pointer group rounded-2xl hover:bg-white/5 active:scale-90">
                                            <Paperclip className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                                        </div>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-56 bg-[#0b0f1a] border-white/10 text-gray-300">
                                        <DropdownMenuItem className="focus:bg-white/5 focus:text-white cursor-pointer">
                                            <FileText className="mr-2 h-4 w-4" />
                                            <span>Upload Document</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="focus:bg-white/5 focus:text-white cursor-pointer">
                                            <Terminal className="mr-2 h-4 w-4" />
                                            <span>Run Script</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <Textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    disabled={!activeServer}
                                    placeholder={activeServer ? "Transmit instruction to the grid..." : "Select a neural node to begin..."}
                                    className="flex-1 bg-transparent border-none focus-visible:ring-0 text-foreground py-4 text-[15px] resize-none max-h-[300px] overflow-y-auto placeholder:text-muted-foreground/40 font-medium tracking-tight shadow-none"
                                    rows={1}
                                />
                                <div className="flex items-center space-x-2 pb-2 pr-1">
                                    <Button
                                        onClick={() => handleSubmit()}
                                        disabled={!input.trim() || isLoading || !activeServer}
                                        className={cn(
                                            "w-12 h-12 rounded-[1.25rem] transition-all flex items-center justify-center border shadow-lg",
                                            !input.trim() || isLoading || !activeServer
                                                ? "bg-white/5 text-muted-foreground cursor-not-allowed border-transparent"
                                                : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-500/20 active:scale-95 border-indigo-400/20"
                                        )}
                                    >
                                        {isLoading ? (
                                            <Sparkles className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Send className="w-5 h-5 ml-0.5" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <p className="text-[10px] text-center text-muted-foreground/30 font-black uppercase tracking-[0.3em] mt-4">
                            UPLINK SECURED • {activeServer?.id.toUpperCase() || 'NULL'} DOMAIN • NEURIX 2.0
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Main Chat View - Neurix AI Reference Style
    return (
        <TooltipProvider>
            <div className="flex-1 flex flex-col h-full bg-background relative z-10">
                {/* Header - Transparent/Glass */}
                <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 backdrop-blur-xl sticky top-0 z-[50] bg-background/80">
                    <div className="flex items-center space-x-4 min-w-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onToggleToolsPanel}
                            className="text-muted-foreground hover:bg-white/5 hover:text-foreground"
                        >
                            <MoreHorizontal className="w-5 h-5" />
                        </Button>

                        <div className="h-8 w-px bg-white/10 hidden sm:block" />

                        <div className="flex items-center space-x-3 overflow-hidden">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg bg-secondary/20 border border-white/5 shadow-inner flex-shrink-0 text-primary">
                                {activeServer ? (
                                    (() => {
                                        const Icon = getServerIcon(activeServer.id);
                                        return <Icon className="w-4 h-4" />;
                                    })()
                                ) : (
                                    <Terminal className="w-4 h-4" />
                                )}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <div className="flex items-center space-x-1.5">
                                    <span className="text-[9px] font-black uppercase tracking-widest leading-none text-indigo-500">UPLINK ACTIVE</span>
                                    <span className={cn("w-1 h-1 rounded-full bg-emerald-500 flex-shrink-0", activeServer?.connected && "animate-pulse")}></span>
                                </div>
                                <h2 className="text-[11px] font-black uppercase tracking-wider leading-none mt-1 truncate text-foreground">
                                    {activeServer?.name || 'Neural'} Protocol
                                </h2>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-muted-foreground/50 border border-white/5 px-2 py-1 rounded bg-white/[0.02]">
                            ID: {messages[0]?.id.substring(0, 8) || 'INIT'}
                        </span>
                    </div>
                </header>

                <ScrollArea className="flex-1 px-6 py-8">
                    <div className="max-w-3xl mx-auto space-y-10 pb-44">
                        {messages.map((msg, idx) => (
                            <div
                                key={msg.id}
                                className={cn(
                                    "flex w-full group animate-in fade-in slide-in-from-bottom-4 duration-500",
                                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                                )}
                            >
                                <div className={cn(
                                    "flex max-w-[90%] md:max-w-[85%] space-x-4",
                                    msg.role === 'user' ? "flex-row-reverse space-x-reverse" : "flex-row"
                                )}>
                                    {/* Profile */}
                                    <div className={cn(
                                        "flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs shadow-xl",
                                        msg.role === 'user'
                                            ? "bg-gradient-to-br from-indigo-500 to-indigo-700 text-white"
                                            : "bg-background/40 hover:bg-background text-indigo-400 border border-white/5 backdrop-blur-sm transition-colors"
                                    )}>
                                        {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-5 h-5" />}
                                    </div>

                                    {/* Text Area */}
                                    <div className={cn("flex flex-col space-y-2", msg.role === 'user' ? "items-end" : "items-start")}>
                                        <div className={cn(
                                            "relative px-6 py-4 rounded-[1.75rem] text-[14px] leading-relaxed shadow-lg transition-all",
                                            msg.role === 'user'
                                                ? "bg-indigo-600 text-white rounded-tr-none px-6"
                                                : "bg-secondary/10 border border-white/5 text-foreground rounded-tl-none backdrop-blur-sm"
                                        )}>
                                            <div className="whitespace-pre-wrap">
                                                {msg.role === 'user' ? (
                                                    <p>{msg.content}</p>
                                                ) : (
                                                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-black/30 prose-pre:border prose-pre:border-white/10 prose-code:text-indigo-300">
                                                        <ReactMarkdown
                                                            components={{
                                                                code(props) {
                                                                    const { className, children, ...rest } = props;
                                                                    const isInline = !String(children).includes('\n');
                                                                    if (isInline) {
                                                                        return <code className="bg-white/10 text-primary px-1.5 py-0.5 rounded text-xs font-mono border border-white/10" {...rest}>{children}</code>;
                                                                    }
                                                                    return (
                                                                        <div className="my-4 rounded-xl border border-white/10 bg-[#0b0f1a] overflow-hidden shadow-sm">
                                                                            <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
                                                                                <div className="flex items-center gap-2">
                                                                                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                                                                                    <span className="text-xs font-mono text-muted-foreground">code block</span>
                                                                                </div>
                                                                                <Button variant="ghost" size="sm" className="h-6 text-[10px] uppercase font-mono text-muted-foreground hover:text-foreground" onClick={() => handleCopy(String(children), msg.id)}>
                                                                                    {copiedId === msg.id ? <Check className="w-3 h-3 mr-1 text-emerald-500" /> : <Copy className="w-3 h-3 mr-1" />} Copy
                                                                                </Button>
                                                                            </div>
                                                                            <div className="p-4 overflow-x-auto">
                                                                                <code className={cn(className, "text-xs font-mono text-gray-300")} {...rest}>
                                                                                    {children}
                                                                                </code>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                }
                                                            }}
                                                        >
                                                            {msg.content}
                                                        </ReactMarkdown>
                                                    </div>
                                                )}
                                                {msg.role === 'assistant' && isLoading && idx === messages.length - 1 && (
                                                    <TypingIndicator />
                                                )}
                                            </div>

                                            {/* Copy Button */}
                                            {msg.role !== 'user' && !isLoading && msg.content && (
                                                <div className="absolute top-2 -right-12 flex opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-white/10" onClick={() => handleCopy(msg.content, msg.id)}>
                                                        <Copy className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>

                                        <span className="text-[8px] text-muted-foreground/50 font-black uppercase tracking-widest px-2">
                                            SYNCED • {msg.timestamp}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2">
                                <div className="w-10 h-10 rounded-2xl bg-background/40 flex items-center justify-center text-indigo-400 border border-white/5 shadow-xl">
                                    <Bot className="w-5 h-5 animate-pulse" />
                                </div>
                                <div className="bg-secondary/10 border border-white/5 px-6 py-4 rounded-[1.75rem] rounded-tl-none">
                                    <TypingIndicator />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </ScrollArea>

                {/* Floating Input Area - Unified Gradient */}
                <div className="absolute bottom-0 left-0 right-0 p-6 z-20 bg-gradient-to-t from-background via-background/90 to-transparent pt-20">
                    <div className="max-w-3xl mx-auto w-full">
                        <div className="backdrop-blur-3xl border rounded-[2.5rem] p-1.5 shadow-2xl ring-1 bg-[#0b0f1a]/80 border-white/10 ring-white/5 transition-all focus-within:ring-indigo-500/50">
                            <div className="flex items-end px-3 py-1 space-x-1">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <div className="p-3.5 text-muted-foreground hover:text-indigo-400 transition-all cursor-pointer group rounded-2xl hover:bg-white/5 active:scale-90">
                                            <Paperclip className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                                        </div>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-56 bg-[#0b0f1a] border-white/10 text-gray-300">
                                        <DropdownMenuItem className="focus:bg-white/5 focus:text-white cursor-pointer">
                                            <FileText className="mr-2 h-4 w-4" />
                                            <span>Upload Document</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="focus:bg-white/5 focus:text-white cursor-pointer">
                                            <Terminal className="mr-2 h-4 w-4" />
                                            <span>Run Script</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <Textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    disabled={!activeServer}
                                    placeholder="Transmit instruction to the grid..."
                                    className="flex-1 bg-transparent border-none focus-visible:ring-0 text-foreground py-4 text-[15px] resize-none max-h-[300px] overflow-y-auto placeholder:text-muted-foreground/40 font-medium tracking-tight shadow-none"
                                    rows={1}
                                />
                                <div className="flex items-center space-x-2 pb-2 pr-1">
                                    <Button
                                        onClick={() => handleSubmit()}
                                        disabled={!input.trim() || isLoading || !activeServer}
                                        className={cn(
                                            "w-12 h-12 rounded-[1.25rem] transition-all flex items-center justify-center border shadow-lg",
                                            !input.trim() || isLoading || !activeServer
                                                ? "bg-white/5 text-muted-foreground cursor-not-allowed border-transparent"
                                                : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-500/20 active:scale-95 border-indigo-400/20"
                                        )}
                                    >
                                        {isLoading ? (
                                            <Sparkles className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Send className="w-5 h-5 ml-0.5" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <p className="text-[10px] text-center text-muted-foreground/30 font-black uppercase tracking-[0.3em] mt-4">
                            UPLINK SECURED • {activeServer?.id.toUpperCase() || 'NULL'} DOMAIN • NEURIX 2.0
                        </p>
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}

