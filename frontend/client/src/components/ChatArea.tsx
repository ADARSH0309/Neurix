import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import {
    Send,
    Terminal,
    Paperclip,
    Copy,
    Check,
    FileText,
    Mic, MicOff,
    Bot,
    User,
    Sparkles,
    X,
    Image as ImageIcon,
    ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message, McpServer, UserProfile } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    TooltipProvider,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { getServerIcon, getServerVisual } from '@/lib/server-utils';

import { useChat } from '@/context/ChatContext';
import { useServer } from '@/context/ServerContext';
import { useUI } from '@/context/UIContext';

// --- File Attachment ---
interface AttachedFile {
    name: string;
    type: string;
    size: number;
    content: string;
}

const SUPPORTED_TYPES = [
    'text/plain', 'text/csv', 'text/html', 'text/markdown',
    'application/json', 'application/xml', 'application/pdf',
];
const SUPPORTED_EXTENSIONS = ['.txt', '.csv', '.json', '.md', '.html', '.xml', '.pdf', '.doc', '.docx', '.log', '.yml', '.yaml'];
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

const serverDescriptions: Record<string, string> = {
    gdrive: 'Manage files & folders',
    gforms: 'Create & analyze forms',
    gmail: 'Read & send emails',
    gcalendar: 'View & manage events',
    gtask: 'Organize your to-dos',
};

const serverAccentColors: Record<string, { border: string; bg: string; text: string; hover: string }> = {
    gdrive: { border: 'border-blue-500/20', bg: 'bg-blue-500/5', text: 'text-blue-600 dark:text-blue-400', hover: 'hover:border-blue-500/40 hover:bg-blue-500/10' },
    gforms: { border: 'border-purple-500/20', bg: 'bg-purple-500/5', text: 'text-purple-600 dark:text-purple-400', hover: 'hover:border-purple-500/40 hover:bg-purple-500/10' },
    gmail: { border: 'border-red-500/20', bg: 'bg-red-500/5', text: 'text-red-600 dark:text-red-400', hover: 'hover:border-red-500/40 hover:bg-red-500/10' },
    gcalendar: { border: 'border-teal-500/20', bg: 'bg-teal-500/5', text: 'text-teal-600 dark:text-teal-400', hover: 'hover:border-teal-500/40 hover:bg-teal-500/10' },
    gtask: { border: 'border-amber-500/20', bg: 'bg-amber-500/5', text: 'text-amber-600 dark:text-amber-400', hover: 'hover:border-amber-500/40 hover:bg-amber-500/10' },
};

async function readFileContent(file: File): Promise<string> {
    if (IMAGE_TYPES.includes(file.type)) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

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
    const { profile } = useUI();

    const activeServer = activeServerId ? servers[activeServerId] : null;
    const messages = currentSession?.messages || [];
    const onSelectServer = setActiveServerId;
    const onSendMessage = sendMessage;

    const [input, setInput] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

    const scrollToBottom = (): void => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => { scrollToBottom(); }, [messages, isLoading]);

    // Speech-to-Text
    const baseTextRef = useRef('');

    const startListening = useCallback(() => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SR) {
                toast.error('Speech recognition not supported. Use Chrome or Edge.');
                return;
            }

            // Save current input as base text
            baseTextRef.current = input;

            const recognition = new SR();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onstart = () => {
                setIsListening(true);
                toast.success('Listening... Speak now', { duration: 2000 });
            };

            recognition.onresult = (e: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                let finalText = '';
                let interimText = '';
                for (let i = 0; i < e.results.length; i++) {
                    const transcript = e.results[i][0].transcript;
                    if (e.results[i].isFinal) {
                        finalText += transcript;
                    } else {
                        interimText += transcript;
                    }
                }
                const base = baseTextRef.current;
                const space = base && !base.endsWith(' ') ? ' ' : '';
                setInput(base + space + finalText + interimText);
            };

            recognition.onerror = (e: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                console.error('STT error:', e.error, e);
                if (e.error === 'not-allowed') {
                    toast.error('Microphone access denied. Allow mic in browser settings.');
                } else if (e.error !== 'aborted' && e.error !== 'no-speech') {
                    toast.error(`Mic error: ${e.error}`);
                }
                setIsListening(false);
                recognitionRef.current = null;
            };

            recognition.onend = () => {
                setIsListening(false);
                recognitionRef.current = null;
            };

            recognitionRef.current = recognition;
            recognition.start();
        } catch (err) {
            console.error('STT failed:', err);
            toast.error('Failed to start speech recognition');
            setIsListening(false);
        }
    }, [input]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        setIsListening(false);
    }, []);

    const toggleListening = useCallback(() => {
        if (isListening) stopListening();
        else startListening();
    }, [isListening, startListening, stopListening]);

    // Cleanup on unmount
    useEffect(() => {
        return () => { recognitionRef.current?.abort(); };
    }, []);

    // File attachment handlers
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        for (const file of Array.from(files)) {
            if (file.size > MAX_FILE_SIZE) {
                toast.error(`${file.name} is too large (max 5MB)`);
                continue;
            }
            const ext = '.' + file.name.split('.').pop()?.toLowerCase();
            const isImage = IMAGE_TYPES.includes(file.type);
            const isText = SUPPORTED_TYPES.includes(file.type) || SUPPORTED_EXTENSIONS.includes(ext);
            if (!isImage && !isText) {
                toast.error(`${file.name}: unsupported file type`);
                continue;
            }
            try {
                const content = await readFileContent(file);
                setAttachedFiles(prev => [...prev, { name: file.name, type: file.type, size: file.size, content }]);
                toast.success(`Attached: ${file.name}`);
            } catch {
                toast.error(`Failed to read ${file.name}`);
            }
        }
        e.target.value = '';
    };

    const removeFile = (index: number) => {
        setAttachedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = (e?: React.FormEvent): void => {
        e?.preventDefault();
        if ((!input.trim() && attachedFiles.length === 0) || isLoading) return;

        let message = input.trim();
        if (attachedFiles.length > 0) {
            const fileContexts = attachedFiles.map(f => {
                if (f.type.startsWith('image/')) return `[Attached image: ${f.name}]`;
                const content = f.content.length > 10000
                    ? f.content.slice(0, 10000) + '\n...(truncated)'
                    : f.content;
                return `--- Attached file: ${f.name} ---\n${content}\n--- End of ${f.name} ---`;
            }).join('\n\n');
            message = message ? `${message}\n\n${fileContexts}` : fileContexts;
        }

        onSendMessage(message);
        setInput('');
        setAttachedFiles([]);
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

    // Empty State
    if (messages.length === 0) {
        return (
            <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
                {/* Background Effect */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-electric-purple/10 via-background to-background opacity-60 pointer-events-none" />

                <div className="flex-1 flex flex-col items-center justify-center text-center max-w-2xl mx-auto px-6 pb-32 relative z-10 animate-in fade-in zoom-in duration-700">
                    {/* Icon */}
                    <div className="relative mb-5 group cursor-default">
                        <div className="absolute inset-0 bg-electric-purple/20 blur-[40px] rounded-full animate-pulse-slow"></div>
                        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-b from-white/[0.08] dark:from-white/[0.08] to-transparent p-px shadow-2xl transition-transform group-hover:scale-105 duration-700">
                            <div className="w-full h-full rounded-2xl bg-background/80 backdrop-blur-xl flex items-center justify-center">
                                {activeServer ? (
                                    (() => {
                                        const Icon = getServerIcon(activeServer.id);
                                        return <Icon className="w-7 h-7 text-electric-purple drop-shadow-[0_0_20px_rgba(139,92,246,0.8)]" />;
                                    })()
                                ) : (
                                    <Terminal className="w-7 h-7 text-slate-grey drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Title & Subtitle */}
                    <h1 className="text-2xl font-black tracking-tight mb-1.5 text-transparent bg-clip-text bg-gradient-to-br from-foreground via-foreground/90 to-foreground/50">
                        {activeServer ? activeServer.name : 'Neurix Workstation'}
                    </h1>
                    <p className="text-slate-grey/70 text-sm font-medium leading-relaxed mb-6 max-w-sm">
                        {activeServer ? (
                            <>Connected to <span className="text-electric-purple font-semibold">{activeServer.name}</span>. Ask a question or try a suggestion below.</>
                        ) : (
                            'Connect a service below to get started, or type a message to begin a conversation.'
                        )}
                    </p>

                    {/* Service Cards or Suggestions */}
                    {!activeServer ? (
                        <div className="flex flex-wrap justify-center gap-2.5 w-full max-w-2xl">
                            {Object.values(servers).filter(s => s.status === 'available').map((server, i) => {
                                const Icon = getServerIcon(server.id);
                                const colors = serverAccentColors[server.id] || { border: 'border-border', bg: 'bg-muted/50', text: 'text-foreground', hover: 'hover:border-electric-purple/40' };
                                const desc = serverDescriptions[server.id] || 'MCP Service';
                                return (
                                    <motion.button
                                        key={server.id}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.06, duration: 0.35 }}
                                        onClick={() => onSelectServer(server.id)}
                                        className={cn(
                                            "flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border transition-all group text-left backdrop-blur-xl",
                                            colors.border, colors.hover,
                                            "bg-background/60 hover:shadow-md active:scale-[0.98]"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300",
                                            colors.bg, "border", colors.border
                                        )}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[13px] font-semibold text-foreground leading-tight">{server.name}</span>
                                            <span className="text-[11px] text-muted-foreground leading-tight">{desc}</span>
                                        </div>
                                        <ChevronRight className={cn("w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0 ml-1", colors.text)} />
                                    </motion.button>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2.5 w-full max-w-lg">
                            {[
                                { text: `What can you do?`, icon: Sparkles },
                                { text: `Show me everything`, icon: Terminal },
                                { text: `List all items`, icon: FileText },
                                { text: `Help me get started`, icon: Send },
                            ].map((p, i) => (
                                <motion.button
                                    key={p.text}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.08 }}
                                    onClick={() => onSendMessage(p.text)}
                                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left transition-all duration-200 group bg-background/60 border border-border hover:border-electric-purple/30 hover:bg-electric-purple/5 hover:shadow-md active:scale-[0.98]"
                                >
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-electric-purple/10 border border-electric-purple/20 text-electric-purple shrink-0 group-hover:bg-electric-purple/15 transition-colors">
                                        <p.icon className="w-4 h-4" />
                                    </div>
                                    <span className="text-[13px] font-medium text-foreground/80 group-hover:text-foreground transition-colors">{p.text}</span>
                                </motion.button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Floating Input for Empty State */}
                <div className="absolute bottom-0 left-0 right-0 p-6 z-20 bg-gradient-to-t from-background via-background/90 to-transparent pt-20">
                    <div className="max-w-3xl mx-auto w-full">
                        {/* Hidden file input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept=".txt,.csv,.json,.md,.html,.xml,.pdf,.doc,.docx,.log,.yml,.yaml,.png,.jpg,.jpeg,.gif,.webp"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        <div className="backdrop-blur-3xl border rounded-[2.5rem] p-1.5 shadow-2xl ring-1 bg-background/80 border-border ring-black/5 dark:ring-white/5 transition-all focus-within:ring-electric-purple/50 focus-within:border-electric-purple/30 focus-within:shadow-[0_0_20px_rgba(139,92,246,0.1)]">
                            {/* Attached files preview */}
                            <AnimatePresence>
                                {attachedFiles.length > 0 && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden px-4 pt-3"
                                    >
                                        <div className="flex flex-wrap gap-2">
                                            {attachedFiles.map((file, i) => (
                                                <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-electric-purple/10 border border-electric-purple/20 text-sm">
                                                    {file.type.startsWith('image/') ? (
                                                        <ImageIcon className="w-3.5 h-3.5 text-electric-purple" />
                                                    ) : (
                                                        <FileText className="w-3.5 h-3.5 text-electric-purple" />
                                                    )}
                                                    <span className="text-xs font-medium text-foreground max-w-[120px] truncate">{file.name}</span>
                                                    <span className="text-[10px] text-muted-foreground">{formatFileSize(file.size)}</span>
                                                    <button onClick={() => removeFile(i)} className="ml-1 text-muted-foreground hover:text-red-500 transition-colors">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="flex items-end px-3 py-1 space-x-1">
                                <div className="p-3.5 text-slate-grey hover:text-electric-purple transition-all cursor-pointer group rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 active:scale-90" onClick={() => fileInputRef.current?.click()} title="Attach file">
                                    <Paperclip className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                                </div>

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
                                <div className="flex items-center space-x-1 pb-2 pr-1">
                                    <button
                                        onClick={toggleListening}
                                        className={cn(
                                            "w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300",
                                            isListening
                                                ? "bg-red-500/15 text-red-500 border border-red-500/30 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                                                : "text-slate-grey hover:text-electric-purple hover:bg-black/5 dark:hover:bg-white/5"
                                        )}
                                        title={isListening ? 'Stop listening' : 'Voice input'}
                                    >
                                        {isListening ? <MicOff className="w-[18px] h-[18px]" /> : <Mic className="w-[18px] h-[18px]" />}
                                    </button>
                                    <Button
                                        onClick={() => handleSubmit()}
                                        disabled={(!input.trim() && attachedFiles.length === 0) || isLoading || !activeServer}
                                        className={cn(
                                            "w-12 h-12 rounded-[1.25rem] transition-all flex items-center justify-center border shadow-lg",
                                            (!input.trim() && attachedFiles.length === 0) || isLoading || !activeServer
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
                        <p className="text-xs text-center text-muted-foreground/40 mt-3">
                            Neurix can make mistakes. Verify important information.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Main Chat View
    return (
        <TooltipProvider>
            <div className="flex-1 flex flex-col h-full bg-transparent relative z-10">
                {/* Header */}
                <header className="h-14 flex items-center justify-between px-6 border-b border-border backdrop-blur-2xl sticky top-0 z-[50] bg-background/80">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-electric-purple/10 border border-electric-purple/20 flex-shrink-0 text-electric-purple">
                            {activeServer ? (
                                (() => {
                                    const Icon = getServerIcon(activeServer.id);
                                    return <Icon className="w-4 h-4" />;
                                })()
                            ) : (
                                <Terminal className="w-4 h-4" />
                            )}
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                            <h2 className="text-sm font-semibold truncate text-foreground">
                                {activeServer?.name || 'Neurix'}
                            </h2>
                            <span className={cn(
                                "w-2 h-2 rounded-full shrink-0",
                                activeServer?.connected ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30"
                            )} />
                        </div>
                    </div>
                </header>

                <ScrollArea className="flex-1 px-4 md:px-6 py-6">
                    <div className="max-w-3xl mx-auto space-y-6 pb-40">
                        {messages.map((msg, idx) => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, ease: 'easeOut' }}
                                className={cn(
                                    "flex w-full group",
                                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                                )}
                            >
                                <div className={cn(
                                    "flex max-w-[88%] md:max-w-[80%] gap-3",
                                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                                )}>
                                    {/* Avatar */}
                                    <div className={cn(
                                        "flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center",
                                        msg.role === 'user'
                                            ? "bg-electric-purple/10 text-electric-purple border border-electric-purple/20"
                                            : "bg-muted/80 dark:bg-white/[0.06] text-foreground border border-border"
                                    )}>
                                        {msg.role === 'user' ? (
                                            <User className="w-4 h-4" />
                                        ) : (
                                            <Bot className="w-4 h-4" />
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className={cn("flex flex-col gap-1.5", msg.role === 'user' ? "items-end" : "items-start")}>
                                        <div className={cn(
                                            "relative px-4 py-3 text-sm leading-relaxed transition-all border",
                                            msg.role === 'user'
                                                ? "bg-electric-purple/10 border-electric-purple/20 text-foreground rounded-2xl rounded-tr-sm"
                                                : "bg-muted/40 dark:bg-white/[0.04] border-border text-foreground rounded-2xl rounded-tl-sm"
                                        )}>
                                            <div className="whitespace-pre-wrap">
                                                {msg.role === 'user' ? (
                                                    <p>{msg.content}</p>
                                                ) : (
                                                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-muted dark:prose-pre:bg-black/40 prose-pre:border prose-pre:border-border prose-code:text-electric-purple/90 prose-headings:text-foreground">
                                                        <ReactMarkdown
                                                            components={{
                                                                code(props) {
                                                                    const { className, children, ...rest } = props;
                                                                    const isInline = !String(children).includes('\n');
                                                                    if (isInline) {
                                                                        return <code className="bg-muted dark:bg-white/[0.06] text-electric-purple/90 px-1.5 py-0.5 rounded text-xs font-mono border border-border" {...rest}>{children}</code>;
                                                                    }
                                                                    return (
                                                                        <div className="my-3 rounded-lg border border-border bg-background overflow-hidden">
                                                                            <div className="flex items-center justify-between px-3 py-2 bg-muted/50 dark:bg-white/[0.03] border-b border-border">
                                                                                <div className="flex items-center gap-2">
                                                                                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                                                                                    <span className="text-xs text-muted-foreground">Code</span>
                                                                                </div>
                                                                                <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground hover:text-foreground rounded-md" onClick={() => handleCopy(String(children), msg.id)}>
                                                                                    {copiedId === msg.id ? <Check className="w-3 h-3 mr-1 text-emerald-500" /> : <Copy className="w-3 h-3 mr-1" />} Copy
                                                                                </Button>
                                                                            </div>
                                                                            <div className="p-3 overflow-x-auto">
                                                                                <code className={cn(className, "text-xs font-mono text-foreground/80")} {...rest}>
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
                                                <div className="absolute top-3 -right-10 flex opacity-0 group-hover:opacity-100 transition-all duration-200">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg" onClick={() => handleCopy(msg.content, msg.id)}>
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>

                                        <span className="text-xs text-muted-foreground/50 px-1">
                                            {msg.timestamp}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                        {isLoading && (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex gap-3"
                            >
                                <div className="w-8 h-8 rounded-xl bg-muted/80 dark:bg-white/[0.06] flex items-center justify-center text-electric-purple border border-border">
                                    <Bot className="w-4 h-4 animate-pulse" />
                                </div>
                                <div className="bg-muted/40 dark:bg-white/[0.04] border border-border px-4 py-3 rounded-2xl rounded-tl-sm">
                                    <TypingIndicator />
                                </div>
                            </motion.div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </ScrollArea>

                {/* Floating Input Area - Unified Gradient */}
                <div className="absolute bottom-0 left-0 right-0 p-6 z-20 bg-gradient-to-t from-background via-background/90 to-transparent pt-20 pointer-events-none">
                    <div className="max-w-3xl mx-auto w-full pointer-events-auto">
                        {/* Hidden file input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept=".txt,.csv,.json,.md,.html,.xml,.pdf,.doc,.docx,.log,.yml,.yaml,.png,.jpg,.jpeg,.gif,.webp"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        <div className="backdrop-blur-3xl border rounded-[2.5rem] p-1.5 shadow-2xl ring-1 bg-background/80 border-border ring-black/5 dark:ring-white/5 transition-all focus-within:ring-electric-purple/50 focus-within:border-electric-purple/30 focus-within:shadow-[0_0_20px_rgba(139,92,246,0.15)]">
                            {/* Attached files preview */}
                            <AnimatePresence>
                                {attachedFiles.length > 0 && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden px-4 pt-3"
                                    >
                                        <div className="flex flex-wrap gap-2">
                                            {attachedFiles.map((file, i) => (
                                                <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-electric-purple/10 border border-electric-purple/20 text-sm">
                                                    {file.type.startsWith('image/') ? (
                                                        <ImageIcon className="w-3.5 h-3.5 text-electric-purple" />
                                                    ) : (
                                                        <FileText className="w-3.5 h-3.5 text-electric-purple" />
                                                    )}
                                                    <span className="text-xs font-medium text-foreground max-w-[120px] truncate">{file.name}</span>
                                                    <span className="text-[10px] text-muted-foreground">{formatFileSize(file.size)}</span>
                                                    <button onClick={() => removeFile(i)} className="ml-1 text-muted-foreground hover:text-red-500 transition-colors">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="flex items-end px-3 py-1 space-x-1">
                                <div className="p-3.5 text-slate-grey hover:text-electric-purple transition-all cursor-pointer group rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 active:scale-90" onClick={() => fileInputRef.current?.click()} title="Attach file">
                                    <Paperclip className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                                </div>

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
                                <div className="flex items-center space-x-1 pb-2 pr-1">
                                    <button
                                        onClick={toggleListening}
                                        className={cn(
                                            "w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300",
                                            isListening
                                                ? "bg-red-500/15 text-red-500 border border-red-500/30 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                                                : "text-slate-grey hover:text-electric-purple hover:bg-black/5 dark:hover:bg-white/5"
                                        )}
                                        title={isListening ? 'Stop listening' : 'Voice input'}
                                    >
                                        {isListening ? <MicOff className="w-[18px] h-[18px]" /> : <Mic className="w-[18px] h-[18px]" />}
                                    </button>
                                    <Button
                                        onClick={() => handleSubmit()}
                                        disabled={(!input.trim() && attachedFiles.length === 0) || isLoading || !activeServer}
                                        className={cn(
                                            "w-12 h-12 rounded-[1.25rem] transition-all duration-300 flex items-center justify-center border shadow-lg relative overflow-hidden",
                                            (!input.trim() && attachedFiles.length === 0) || isLoading || !activeServer
                                                ? "bg-black/5 dark:bg-white/5 text-slate-500 cursor-not-allowed border-transparent opacity-50"
                                                : "bg-background text-electric-purple hover:bg-electric-purple/10 active:scale-95 border-electric-purple/30 hover:border-electric-purple/50 shadow-[0_0_15px_rgba(139,92,246,0.15)] hover:shadow-[0_0_20px_rgba(139,92,246,0.25)]"
                                        )}
                                    >
                                        {(!input.trim() && attachedFiles.length === 0) || isLoading || !activeServer ? null : <div className="absolute inset-0 bg-electric-purple/5 animate-pulse rounded-[1.25rem]"></div>}
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

