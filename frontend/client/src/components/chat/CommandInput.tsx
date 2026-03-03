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
                <div className={cn(
                    "relative rounded-2xl overflow-hidden transition-all duration-500 backdrop-blur-3xl",
                    "bg-[#2a1226]/90 border shadow-[0_10px_40px_rgba(42,18,38,0.6)]",
                    isFocused
                        ? "border-electric-purple/50 shadow-[0_0_40px_rgba(139,92,246,0.25)] bg-[#2a1226]/95 ring-1 ring-electric-purple/25"
                        : "border-white/15 hover:border-white/25 hover:shadow-[0_0_20px_rgba(255,243,230,0.08)]"
                )}>
                    <div className="flex items-end p-2.5 gap-1.5">
                        {/* Left actions */}
                        <div className="pb-1 pl-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-xl text-slate-grey hover:text-white hover:bg-white/5 transition-all"
                            >
                                <Paperclip className="h-4 w-4 drop-shadow-md" />
                            </Button>
                        </div>

                        {/* Input */}
                        <div className="flex-1 py-1 min-h-[44px]">
                            <Textarea
                                ref={inputRef}
                                data-command-input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                placeholder={placeholder || (activeServer ? `Message ${activeServer.name}...` : "Ask anything or type / for commands...")}
                                disabled={isLoading}
                                className="w-full bg-transparent border-0 outline-none ring-0 focus-visible:ring-0 px-2 py-1 min-h-[24px] max-h-[200px] resize-none text-[15px] leading-relaxed text-white/90 placeholder:text-white/30 overflow-y-auto custom-scrollbar"
                                rows={1}
                                onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = 'auto';
                                    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
                                }}
                            />
                        </div>

                        {/* Right actions */}
                        <div className="pb-1 pr-1 flex items-center gap-1.5">
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
                                            className="h-9 w-9 rounded-xl text-slate-grey hover:text-white hover:bg-white/5 transition-all"
                                        >
                                            <Mic className="h-4 w-4 drop-shadow-md" />
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
                                        whileHover={{ scale: 1.08 }}
                                        whileTap={{ scale: 0.92 }}
                                        onClick={handleSubmit}
                                        disabled={isLoading}
                                        className={cn(
                                            "h-9 w-9 rounded-xl flex items-center justify-center text-white transition-all duration-300",
                                            "bg-electric-purple hover:bg-[#a600e6]",
                                            "shadow-[0_0_15px_rgba(189,0,255,0.4)] hover:shadow-[0_0_20px_rgba(189,0,255,0.6)]",
                                            isLoading && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        <ArrowUp className="h-4 w-4 drop-shadow-md" strokeWidth={2.5} />
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

                    {/* Status bar */}
                    <AnimatePresence>
                        {(activeServer || isFocused) && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                            >
                                <div className="px-4 pb-2.5 flex items-center gap-3 text-[10px] text-white/40 font-mono uppercase tracking-wider">
                                    {activeServer && (
                                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.06] border border-white/[0.06]">
                                            <Globe className="w-3 h-3 text-mint-green" />
                                            <span className="text-white/50">{activeServer.name}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.06] border border-white/[0.06]">
                                        <Command className="w-3 h-3 text-neurix-orange/70" />
                                        <span className="text-white/50">/ commands</span>
                                    </div>
                                    <div className="ml-auto flex items-center gap-1.5 text-white/30">
                                        <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[9px] text-white/40">Enter</kbd>
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
