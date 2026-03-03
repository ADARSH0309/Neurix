import { useRef, useState, useEffect } from 'react';
import { Paperclip, Mic, Globe, ArrowUp, Command } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useChat } from '../../context/ChatContext';
import { useServer } from '../../context/ServerContext';
import { useUI } from '../../context/UIContext';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { CommandPalette } from './CommandPalette';

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
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const activeServer = activeServerId ? servers[activeServerId] : null;

    useEffect(() => {
        setShowPalette(input.startsWith('/'));
    }, [input]);

    const handleSubmit = () => {
        if (!input.trim() || isLoading) return;
        onSend(input);
        setInput('');
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

    const hasInput = input.trim().length > 0;

    return (
        <div className="w-full max-w-3xl mx-auto px-4 pb-6 pt-2 relative">
            <AnimatePresence>
                {showPalette && (
                    <CommandPalette query={input} onSelect={handleCommandSelect} onClose={() => setShowPalette(false)} />
                )}
            </AnimatePresence>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative group">
                <div className={cn("pulse-command-bar px-2")}>
                    <div className="flex items-end p-1 gap-1.5">
                        {/* Left actions */}
                        <div className="p-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-full text-obsidian/60 hover:text-neurix-orange hover:bg-black/5 dark:text-paper/60 dark:hover:text-paper dark:hover:bg-white/10 transition-all"
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
                                className="w-full bg-transparent border-0 outline-none ring-0 focus-visible:ring-0 px-2 py-0 min-h-[24px] max-h-[200px] resize-none text-[16px] font-medium leading-relaxed text-obsidian dark:text-paper placeholder:text-obsidian/40 dark:placeholder:text-paper/40 overflow-y-auto custom-scrollbar"
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
                                {!hasInput && (
                                    <motion.div
                                        key="mic"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                    >
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-10 w-10 rounded-full text-obsidian/60 hover:text-neurix-orange hover:bg-black/5 dark:text-paper/60 dark:hover:text-paper dark:hover:bg-white/10 transition-all"
                                        >
                                            <Mic className="h-5 w-5" strokeWidth={1.5} />
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
                                <div className="flex items-center gap-3 text-[11px] font-mono uppercase tracking-wider text-obsidian/40 dark:text-paper/40 font-bold">
                                    {activeServer && (
                                        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.06]">
                                            <Globe className="w-3.5 h-3.5 text-mint-green" />
                                            <span className="text-obsidian/70 dark:text-paper/70">{activeServer.name}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.06]">
                                        <Command className="w-3.5 h-3.5 text-neurix-orange/80" />
                                        <span className="text-obsidian/70 dark:text-paper/70">/ commands</span>
                                    </div>
                                    <div className="ml-auto flex items-center gap-1.5 text-obsidian/50 dark:text-paper/40">
                                        <kbd className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/[0.06] border border-black/10 dark:border-white/[0.08] text-[9px] text-obsidian/60 dark:text-paper/50">Enter</kbd>
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
