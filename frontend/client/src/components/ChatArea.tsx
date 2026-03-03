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
            <div className="w-1 h-1 bg-electric-purple rounded-full animate-bounce"></div>
            <div className="w-1 h-1 bg-electric-purple rounded-full animate-bounce [animation-delay:200ms]"></div>
            <div className="w-1 h-1 bg-electric-purple rounded-full animate-bounce [animation-delay:400ms]"></div>
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
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-electric-purple/10 via-background to-background opacity-60 pointer-events-none" />

                <div className="flex-1 flex flex-col items-center justify-center text-center max-w-xl mx-auto py-10 px-6 relative z-10 animate-in fade-in zoom-in duration-700">
                    <div className="relative mb-10 group cursor-default">
                        <div className="absolute inset-0 bg-electric-purple/20 blur-[50px] rounded-full animate-pulse-slow"></div>
                        <div className="relative w-28 h-28 rounded-[2rem] bg-gradient-to-b from-white/[0.08] dark:from-white/[0.08] to-transparent p-px shadow-2xl transition-transform group-hover:scale-105 duration-700">
                            <div className="w-full h-full rounded-[2rem] bg-background/80 backdrop-blur-xl flex items-center justify-center">
                                {activeServer ? (
                                    (() => {
                                        const Icon = getServerIcon(activeServer.id);
                                        return <Icon className="w-12 h-12 text-electric-purple drop-shadow-[0_0_20px_rgba(139,92,246,0.8)]" />;
                                    })()
                                ) : (
                                    <Terminal className="w-12 h-12 text-slate-grey drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
                                )}
                            </div>
                        </div>
                    </div>

                    <h1 className="text-4xl font-black tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-br from-foreground via-foreground/90 to-foreground/50 drop-shadow-sm">
                        {activeServer ? 'Enclave Assigned' : 'Neurix Workstation'}
                    </h1>
                    <p className="text-slate-grey/80 text-base font-medium leading-relaxed tracking-wide mb-12 max-w-sm">
                        {activeServer ? (
                            <>Current bridge established to the <span className="text-electric-purple font-bold uppercase drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]">{activeServer.name}</span> MCP. Operational parameters are synchronized.</>
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
                                        transition={{ delay: i * 0.1, duration: 0.5 }}
                                        onClick={() => onSelectServer(server.id)}
                                        className="flex items-center gap-4 p-4 rounded-2xl bg-black/[0.02] border border-black/5 hover:border-electric-purple/40 hover:bg-black/[0.04] hover:shadow-[0_8px_30px_rgba(139,92,246,0.12)] transition-all group text-left backdrop-blur-xl"
                                    >
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-background border border-border text-slate-grey group-hover:text-electric-purple group-hover:border-electric-purple/30 group-hover:shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all duration-300">
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-foreground group-hover:text-foreground transition-colors">{server.name}</span>
                                            <span className="text-[10px] font-mono font-medium tracking-widest text-slate-grey/60 group-hover:text-electric-purple/80 transition-colors uppercase mt-0.5">Initialize</span>
                                        </div>
                                    </motion.button>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
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
                                    className="p-4 rounded-2xl text-left transition-all duration-300 text-[11px] font-black uppercase tracking-widest flex items-center justify-between group bg-black/[0.02] border border-black/5 text-slate-grey hover:border-electric-purple/40 hover:text-foreground hover:bg-electric-purple/10 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)] backdrop-blur-xl"
                                >
                                    <span className="truncate pr-4 leading-tight">{p}</span>
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-background border border-border group-hover:border-electric-purple/30 group-hover:bg-electric-purple/20 transition-all opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0">
                                        <Send className="w-3 h-3 text-electric-purple" />
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Floating Input for Empty State */}
                <div className="absolute bottom-0 left-0 right-0 p-6 z-20 bg-gradient-to-t from-background via-background/90 to-transparent pt-20">
                    <div className="max-w-3xl mx-auto w-full">
                        <div className="backdrop-blur-3xl border rounded-[2.5rem] p-1.5 shadow-2xl ring-1 bg-background/80 border-border ring-black/5 dark:ring-white/5 transition-all focus-within:ring-electric-purple/50 focus-within:border-electric-purple/30 focus-within:shadow-[0_0_20px_rgba(139,92,246,0.1)]">
                            <div className="flex items-end px-3 py-1 space-x-1">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <div className="p-3.5 text-slate-grey hover:text-electric-purple transition-all cursor-pointer group rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 active:scale-90">
                                            <Paperclip className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                                        </div>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-56 bg-background/95 backdrop-blur-3xl border-border text-foreground shadow-2xl">
                                        <DropdownMenuItem className="focus:bg-black/5 dark:focus:bg-white/5 focus:text-foreground cursor-pointer">
                                            <FileText className="mr-2 h-4 w-4" />
                                            <span>Upload Document</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="focus:bg-black/5 dark:focus:bg-white/5 focus:text-foreground cursor-pointer">
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
                                    placeholder={activeServer ? "Command node or ask a question..." : "Waiting for connection..."}
                                    className="flex-1 bg-transparent border-none focus-visible:ring-0 text-foreground py-4 text-[15px] resize-none max-h-[300px] overflow-y-auto placeholder:text-slate-grey/50 font-medium tracking-tight shadow-none selection:bg-electric-purple/30"
                                    rows={1}
                                />
                                <div className="flex items-center space-x-2 pb-2 pr-1">
                                    <Button
                                        onClick={() => handleSubmit()}
                                        disabled={!input.trim() || isLoading || !activeServer}
                                        className={cn(
                                            "w-12 h-12 rounded-[1.25rem] transition-all flex items-center justify-center border shadow-lg",
                                            !input.trim() || isLoading || !activeServer
                                                ? "bg-black/5 dark:bg-white/5 text-slate-500 cursor-not-allowed border-transparent"
                                                : "bg-electric-purple text-white hover:bg-electric-purple/90 shadow-[0_0_15px_rgba(139,92,246,0.2)] active:scale-95 border-electric-purple/20"
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
            <div className="flex-1 flex flex-col h-full bg-transparent relative z-10">
                {/* Header - Transparent/Glass */}
                <header className="h-16 flex items-center justify-between px-6 border-b border-border backdrop-blur-2xl sticky top-0 z-[50] bg-background/60">
                    <div className="flex items-center space-x-4 min-w-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onToggleToolsPanel}
                            className="text-slate-grey hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground transition-colors"
                        >
                            <MoreHorizontal className="w-5 h-5" />
                        </Button>

                        <div className="h-8 w-px bg-border hidden sm:block" />

                        <div className="flex items-center space-x-3 overflow-hidden">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg bg-electric-purple/10 border border-electric-purple/20 shadow-[0_0_10px_rgba(139,92,246,0.1)] flex-shrink-0 text-electric-purple">
                                {activeServer ? (
                                    (() => {
                                        const Icon = getServerIcon(activeServer.id);
                                        return <Icon className="w-4 h-4 shadow-[0_0_15px_rgba(139,92,246,0.3)]" />;
                                    })()
                                ) : (
                                    <Terminal className="w-4 h-4 shadow-[0_0_15px_rgba(139,92,246,0.3)]" />
                                )}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <div className="flex items-center space-x-1.5">
                                    <span className="text-[9px] font-black uppercase tracking-widest leading-none text-electric-purple/80">UPLINK ACTIVE</span>
                                    <span className={cn("w-1 h-1 rounded-full bg-mint-green flex-shrink-0 shadow-[0_0_5px_rgba(52,211,153,0.5)]", activeServer?.connected && "animate-pulse")}></span>
                                </div>
                                <h2 className="text-[11px] font-black uppercase tracking-wider leading-none mt-1 truncate text-foreground">
                                    {activeServer?.name || 'Neural'} Protocol
                                </h2>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-grey/60 border border-border px-2 py-1 rounded-md bg-black/[0.02] dark:bg-white/[0.02] shadow-inner">
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
                                        "flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs shadow-2xl backdrop-blur-xl relative overflow-hidden",
                                        msg.role === 'user'
                                            ? "bg-electric-purple/10 text-electric-purple border border-electric-purple/20 shadow-[0_5px_15px_rgba(139,92,246,0.2)]"
                                            : "bg-background/80 text-foreground border border-border hover:border-electric-purple/30 transition-colors shadow-[0_5px_15px_rgba(0,0,0,0.1)] dark:shadow-[0_5px_15px_rgba(0,0,0,0.5)]"
                                    )}>
                                        {msg.role === 'user' ? (
                                            <>
                                                <div className="absolute inset-0 bg-gradient-to-br from-electric-purple/20 to-transparent mix-blend-overlay"></div>
                                                <User className="w-4 h-4 z-10 drop-shadow-md" />
                                            </>
                                        ) : (
                                            <>
                                                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-electric-purple to-transparent pointer-events-none"></div>
                                                <Bot className="w-5 h-5 drop-shadow-[0_0_8px_rgba(139,92,246,0.6)] text-foreground relative z-10" />
                                            </>
                                        )}
                                    </div>

                                    {/* Text Area */}
                                    <div className={cn("flex flex-col space-y-2", msg.role === 'user' ? "items-end" : "items-start")}>
                                        <div className={cn(
                                            "relative px-6 py-4 text-[15px] leading-relaxed shadow-2xl transition-all border backdrop-blur-2xl",
                                            msg.role === 'user'
                                                ? "bg-electric-purple/10 border-electric-purple/20 text-foreground rounded-3xl rounded-tr-md shadow-[0_8px_30px_rgba(139,92,246,0.15)]"
                                                : "bg-black/[0.02] dark:bg-white/[0.03] border-border text-slate-800 dark:text-slate-200 rounded-3xl rounded-tl-md hover:border-black/10 dark:hover:border-white/20 shadow-[0_8px_30px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
                                        )}>
                                            <div className="whitespace-pre-wrap">
                                                {msg.role === 'user' ? (
                                                    <p>{msg.content}</p>
                                                ) : (
                                                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-black/5 dark:prose-pre:bg-[#381932]/80 prose-pre:border prose-pre:border-border prose-pre:backdrop-blur-2xl prose-code:text-electric-purple/90 prose-headings:text-foreground">
                                                        <ReactMarkdown
                                                            components={{
                                                                code(props) {
                                                                    const { className, children, ...rest } = props;
                                                                    const isInline = !String(children).includes('\n');
                                                                    if (isInline) {
                                                                        return <code className="bg-black/5 dark:bg-black/50 text-electric-purple/90 px-1.5 py-0.5 rounded text-[13px] font-mono border border-border shadow-inner" {...rest}>{children}</code>;
                                                                    }
                                                                    return (
                                                                        <div className="my-4 rounded-xl border border-border bg-background/80 overflow-hidden shadow-2xl backdrop-blur-2xl ring-1 ring-black/5 dark:ring-white/5">
                                                                            <div className="flex items-center justify-between px-4 py-2 bg-black/[0.03] dark:bg-white/[0.03] border-b border-border">
                                                                                <div className="flex items-center gap-2">
                                                                                    <FileText className="w-3.5 h-3.5 text-electric-purple/80 drop-shadow-[0_0_5px_rgba(139,92,246,0.5)]" />
                                                                                    <span className="text-xs font-mono text-slate-grey/80 uppercase tracking-widest">Code Block</span>
                                                                                </div>
                                                                                <Button variant="ghost" size="sm" className="h-6 text-[10px] uppercase font-mono text-slate-grey hover:text-foreground hover:bg-black/10 dark:hover:bg-white/10 transition-colors rounded-lg" onClick={() => handleCopy(String(children), msg.id)}>
                                                                                    {copiedId === msg.id ? <Check className="w-3 h-3 mr-1 text-mint-green drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]" /> : <Copy className="w-3 h-3 mr-1" />} Copy
                                                                                </Button>
                                                                            </div>
                                                                            <div className="p-4 overflow-x-auto">
                                                                                <code className={cn(className, "text-xs font-mono text-slate-700 dark:text-slate-300 drop-shadow-sm")} {...rest}>
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
                                                <div className="absolute top-4 -right-12 flex opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-grey hover:text-foreground hover:bg-black/10 dark:hover:bg-white/10 border border-transparent hover:border-border rounded-xl" onClick={() => handleCopy(msg.content, msg.id)}>
                                                        <Copy className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>

                                        <span className="text-[9px] text-slate-grey/40 font-mono font-bold uppercase tracking-widest px-2 drop-shadow-sm">
                                            SYNCED • {msg.timestamp}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2">
                                <div className="w-10 h-10 rounded-2xl bg-background/60 flex items-center justify-center text-electric-purple border border-border shadow-xl backdrop-blur-md">
                                    <Bot className="w-5 h-5 animate-pulse" />
                                </div>
                                <div className="bg-background/60 border border-border px-6 py-4 rounded-3xl rounded-tl-sm backdrop-blur-md shadow-lg">
                                    <TypingIndicator />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </ScrollArea>

                {/* Floating Input Area - Unified Gradient */}
                <div className="absolute bottom-0 left-0 right-0 p-6 z-20 bg-gradient-to-t from-background via-background/90 to-transparent pt-20 pointer-events-none">
                    <div className="max-w-3xl mx-auto w-full pointer-events-auto">
                        <div className="backdrop-blur-3xl border rounded-[2.5rem] p-1.5 shadow-2xl ring-1 bg-background/80 border-border ring-black/5 dark:ring-white/5 transition-all focus-within:ring-electric-purple/50 focus-within:border-electric-purple/30 focus-within:shadow-[0_0_20px_rgba(139,92,246,0.15)]">
                            <div className="flex items-end px-3 py-1 space-x-1">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <div className="p-3.5 text-slate-grey hover:text-electric-purple transition-all cursor-pointer group rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 active:scale-90">
                                            <Paperclip className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                                        </div>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-56 bg-background/95 backdrop-blur-3xl border-border text-foreground shadow-2xl">
                                        <DropdownMenuItem className="focus:bg-black/10 dark:focus:bg-white/10 focus:text-foreground cursor-pointer transition-colors">
                                            <FileText className="mr-2 h-4 w-4" />
                                            <span>Upload Document</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="focus:bg-black/10 dark:focus:bg-white/10 focus:text-foreground cursor-pointer transition-colors">
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
                                    placeholder="Ask anything, or enter commands to execute..."
                                    className="flex-1 bg-transparent border-none focus-visible:ring-0 text-foreground py-4 text-[15px] resize-none max-h-[300px] overflow-y-auto placeholder:text-slate-grey/50 font-medium tracking-tight shadow-none selection:bg-electric-purple/30"
                                    rows={1}
                                />
                                <div className="flex items-center space-x-2 pb-2 pr-1">
                                    <Button
                                        onClick={() => handleSubmit()}
                                        disabled={!input.trim() || isLoading || !activeServer}
                                        className={cn(
                                            "w-12 h-12 rounded-[1.25rem] transition-all duration-300 flex items-center justify-center border shadow-lg relative overflow-hidden",
                                            !input.trim() || isLoading || !activeServer
                                                ? "bg-black/5 dark:bg-white/5 text-slate-500 cursor-not-allowed border-transparent opacity-50"
                                                : "bg-background text-electric-purple hover:bg-electric-purple/10 active:scale-95 border-electric-purple/30 hover:border-electric-purple/50 shadow-[0_0_15px_rgba(139,92,246,0.15)] hover:shadow-[0_0_20px_rgba(139,92,246,0.25)]"
                                        )}
                                    >
                                        {(!input.trim() || isLoading || !activeServer) ? null : <div className="absolute inset-0 bg-electric-purple/5 animate-pulse rounded-[1.25rem]"></div>}
                                        {isLoading ? (
                                            <Sparkles className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Send className="w-5 h-5 ml-0.5" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <p className="text-[10px] text-center text-slate-grey/40 font-black uppercase tracking-[0.3em] mt-4">
                            UPLINK SECURED • {activeServer?.id.toUpperCase() || 'NULL'} DOMAIN • NEURIX 2.0
                        </p>
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}

