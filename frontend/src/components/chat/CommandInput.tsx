import { useRef, useState, useEffect, useCallback } from 'react';
import { Paperclip, Mic, MicOff, Globe, ArrowUp, Command, X, FileText, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useChat } from '../../context/ChatContext';
import { useServer } from '../../context/ServerContext';
import { useUI } from '../../context/UIContext';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { CommandPalette } from './CommandPalette';

interface AttachedFile {
    name: string;
    type: string;
    size: number;
    content: string; // text content or base64 for images
}

const SUPPORTED_TYPES = [
    'text/plain', 'text/csv', 'text/html', 'text/markdown',
    'application/json', 'application/xml',
    'application/pdf',
];
const SUPPORTED_EXTENSIONS = ['.txt', '.csv', '.json', '.md', '.html', '.xml', '.pdf', '.doc', '.docx', '.log', '.yml', '.yaml'];
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function readFileContent(file: File): Promise<string> {
    // Images → base64
    if (IMAGE_TYPES.includes(file.type)) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    // Text-based files → read as text
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

interface CommandInputProps {
    onSend: (text: string) => void;
    isLoading: boolean;
    placeholder?: string;
}

export function CommandInput({ onSend, isLoading, placeholder }: CommandInputProps) {
    const { activeServerId, servers } = useServer();
    const { createSession, clearAllSessions } = useChat();
    const { setShowSettingsDialog } = useUI();
    const [input, setInput] = useState('');
    const [showPalette, setShowPalette] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
    const baseTextRef = useRef('');
    const activeServer = activeServerId ? servers[activeServerId] : null;

    useEffect(() => {
        setShowPalette(input.startsWith('/'));
    }, [input]);

    // Speech-to-Text
    const startListening = useCallback(() => {
        try {
            const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition; // eslint-disable-line @typescript-eslint/no-explicit-any
            if (!SR) {
                toast.error('Speech recognition not supported. Use Chrome or Edge.');
                return;
            }
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
                    const t = e.results[i][0].transcript;
                    if (e.results[i].isFinal) finalText += t;
                    else interimText += t;
                }
                const base = baseTextRef.current;
                const space = base && !base.endsWith(' ') ? ' ' : '';
                setInput(base + space + finalText + interimText);
            };
            recognition.onerror = (e: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                if (e.error === 'not-allowed') toast.error('Microphone access denied.');
                else if (e.error !== 'aborted' && e.error !== 'no-speech') toast.error(`Mic error: ${e.error}`);
                setIsListening(false);
                recognitionRef.current = null;
            };
            recognition.onend = () => { setIsListening(false); recognitionRef.current = null; };

            recognitionRef.current = recognition;
            recognition.start();
        } catch (err) {
            toast.error('Failed to start speech recognition');
            setIsListening(false);
        }
    }, [input]);

    const stopListening = useCallback(() => {
        recognitionRef.current?.stop();
        recognitionRef.current = null;
        setIsListening(false);
    }, []);

    const toggleListening = useCallback(() => {
        if (isListening) stopListening(); else startListening();
    }, [isListening, startListening, stopListening]);

    useEffect(() => { return () => { recognitionRef.current?.abort(); }; }, []);

    // File attachment
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
                setAttachedFiles(prev => [...prev, {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    content,
                }]);
                toast.success(`Attached: ${file.name}`);
            } catch {
                toast.error(`Failed to read ${file.name}`);
            }
        }

        // Reset input so same file can be re-selected
        e.target.value = '';
    };

    const removeFile = (index: number) => {
        setAttachedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = () => {
        if ((!input.trim() && attachedFiles.length === 0) || isLoading) return;

        // Build message with file context
        let message = input.trim();
        if (attachedFiles.length > 0) {
            const fileContexts = attachedFiles.map(f => {
                if (f.type.startsWith('image/')) {
                    return `[Attached image: ${f.name}]`;
                }
                // Truncate very large files
                const content = f.content.length > 10000
                    ? f.content.slice(0, 10000) + '\n...(truncated)'
                    : f.content;
                return `--- Attached file: ${f.name} ---\n${content}\n--- End of ${f.name} ---`;
            }).join('\n\n');

            message = message
                ? `${message}\n\n${fileContexts}`
                : fileContexts;
        }

        onSend(message);
        setInput('');
        setAttachedFiles([]);
        setShowPalette(false);
        if (inputRef.current) inputRef.current.style.height = 'auto';
    };

    const handleCommandSelect = (command: string, action?: string) => {
        setShowPalette(false);
        setInput('');
        if (action === 'send') onSend(command);
        else if (action === 'action:new') createSession();
        else if (action === 'action:clear') clearAllSessions();
        else if (action === 'action:settings') setShowSettingsDialog(true);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (showPalette && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Enter')) return;
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
    };

    useEffect(() => { if (!isLoading) inputRef.current?.focus(); }, [isLoading]);

    const hasInput = input.trim().length > 0 || attachedFiles.length > 0;

    return (
        <div className="w-full max-w-3xl mx-auto px-4 pb-6 pt-2 relative">
            <AnimatePresence>
                {showPalette && (
                    <CommandPalette query={input} onSelect={handleCommandSelect} onClose={() => setShowPalette(false)} />
                )}
            </AnimatePresence>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".txt,.csv,.json,.md,.html,.xml,.pdf,.doc,.docx,.log,.yml,.yaml,.png,.jpg,.jpeg,.gif,.webp"
                onChange={handleFileSelect}
                className="hidden"
            />

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative group">
                <div className={cn("pulse-command-bar px-2")}>
                    {/* Attached files preview */}
                    <AnimatePresence>
                        {attachedFiles.length > 0 && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                            >
                                <div className="flex flex-wrap gap-2 px-3 pt-3 pb-1">
                                    {attachedFiles.map((file, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/60 dark:bg-white/[0.06] border border-border text-xs group/file"
                                        >
                                            {file.type.startsWith('image/') ? (
                                                <ImageIcon size={14} className="text-blue-500 shrink-0" />
                                            ) : (
                                                <FileText size={14} className="text-neurix-orange shrink-0" />
                                            )}
                                            <span className="text-foreground/80 font-medium truncate max-w-[120px]">{file.name}</span>
                                            <span className="text-muted-foreground/50">{formatFileSize(file.size)}</span>
                                            <button
                                                onClick={() => removeFile(idx)}
                                                className="ml-0.5 p-0.5 rounded-full text-muted-foreground/40 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex items-end p-1 gap-1.5">
                        {/* Attach file button */}
                        <div className="p-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => fileInputRef.current?.click()}
                                className="h-10 w-10 rounded-full text-muted-foreground hover:text-neurix-orange hover:bg-black/5 dark:hover:bg-white/10 transition-all"
                                title="Attach file"
                            >
                                <Paperclip className="h-5 w-5" strokeWidth={1.5} />
                            </Button>
                        </div>

                        {/* Input */}
                        <div className="flex-1 py-1 min-h-[44px] flex items-center">
                            <Textarea
                                ref={inputRef}
                                data-command-input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                placeholder={placeholder || (activeServer ? `Message ${activeServer.name}...` : "Query the central memory...")}
                                disabled={isLoading}
                                className="w-full bg-transparent border-0 outline-none ring-0 focus-visible:ring-0 px-2 py-0 min-h-[24px] max-h-[200px] resize-none text-[16px] font-medium leading-relaxed text-foreground placeholder:text-muted-foreground overflow-y-auto custom-scrollbar"
                                rows={1}
                                onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = 'auto';
                                    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
                                }}
                            />
                        </div>

                        {/* Right actions */}
                        <div className="p-1 flex items-center gap-1.5">
                            <AnimatePresence mode="wait">
                                {(!hasInput || isListening) && (
                                    <motion.div
                                        key="mic"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                    >
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={toggleListening}
                                            className={cn(
                                                "h-10 w-10 rounded-full transition-all",
                                                isListening
                                                    ? "text-red-500 bg-red-500/10 hover:bg-red-500/20 animate-pulse"
                                                    : "text-muted-foreground hover:text-neurix-orange hover:bg-black/5 dark:hover:bg-white/10"
                                            )}
                                            title={isListening ? 'Stop listening' : 'Voice input'}
                                        >
                                            {isListening ? <MicOff className="h-5 w-5" strokeWidth={1.5} /> : <Mic className="h-5 w-5" strokeWidth={1.5} />}
                                        </Button>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <AnimatePresence mode="wait">
                                {hasInput ? (
                                    <motion.button
                                        key="send"
                                        initial={{ scale: 0.6, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.6, opacity: 0 }}
                                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handleSubmit}
                                        disabled={isLoading}
                                        className={cn(
                                            "send-button w-10 h-10",
                                            isLoading && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        <ArrowUp className="h-5 w-5 text-white" strokeWidth={2.5} />
                                    </motion.button>
                                ) : (
                                    <motion.div
                                        key="status"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex items-center justify-center h-9 w-9"
                                    >
                                        {activeServer ? (
                                            <div className="w-2.5 h-2.5 rounded-full bg-mint-green animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                        ) : (
                                            <div className="w-2.5 h-2.5 rounded-full bg-slate-grey/30" />
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Status bar */}
                <div className="mt-4 px-2">
                    <AnimatePresence mode="wait">
                        {(activeServer || isFocused) && (
                            <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                            >
                                <div className="flex items-center gap-3 text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-bold">
                                    {activeServer && (
                                        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.06]">
                                            <Globe className="w-3.5 h-3.5 text-mint-green" />
                                            <span className="text-foreground/70">{activeServer.name}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.06]">
                                        <Command className="w-3.5 h-3.5 text-neurix-orange/80" />
                                        <span className="text-foreground/70">/ commands</span>
                                    </div>
                                    <div className="ml-auto flex items-center gap-1.5 text-muted-foreground">
                                        <kbd className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/[0.06] border border-black/10 dark:border-white/[0.08] text-[9px] text-muted-foreground">Enter</kbd>
                                        <span>send</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}
