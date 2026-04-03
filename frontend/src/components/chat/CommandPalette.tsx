import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, PlusCircle, Trash2, Settings, Wifi, Command } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandPaletteProps {
    query: string;
    onSelect: (command: string, action?: string) => void;
    onClose: () => void;
}

const COMMANDS = [
    { id: 'help', label: '/help', description: 'Show available commands', icon: HelpCircle, action: 'send' },
    { id: 'new', label: '/new', description: 'Create a new chat session', icon: PlusCircle, action: 'action:new' },
    { id: 'clear', label: '/clear', description: 'Clear all chat sessions', icon: Trash2, action: 'action:clear' },
    { id: 'settings', label: '/settings', description: 'Open settings dialog', icon: Settings, action: 'action:settings' },
    { id: 'connect', label: '/connect', description: 'Connect to a service', icon: Wifi, action: 'send' },
];

export function CommandPalette({ query, onSelect, onClose }: CommandPaletteProps) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);

    const filterText = query.startsWith('/') ? query.slice(1).toLowerCase() : '';
    const filtered = COMMANDS.filter(cmd =>
        cmd.label.toLowerCase().includes(filterText) || cmd.description.toLowerCase().includes(filterText)
    );

    useEffect(() => { setSelectedIndex(0); }, [filterText]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(prev => Math.max(prev - 1, 0)); }
            else if (e.key === 'Enter' && filtered.length > 0) { e.preventDefault(); onSelect(filtered[selectedIndex].label, filtered[selectedIndex].action); }
            else if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [filtered, selectedIndex, onSelect, onClose]);

    if (filtered.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            ref={listRef}
            className="absolute bottom-full left-0 right-0 mb-2 mx-4 max-w-3xl mx-auto rounded-xl bg-midnight/80 backdrop-blur-3xl border border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.5)] overflow-hidden z-50"
        >
            <div className="px-3 py-2 border-b border-white/5 flex items-center gap-2 bg-black/40">
                <Command className="w-3 h-3 text-electric-purple drop-shadow-[0_0_8px_rgba(189,0,255,0.6)]" />
                <span className="text-[10px] font-mono text-slate-grey uppercase tracking-widest">Commands</span>
            </div>
            <div className="py-1 max-h-64 overflow-y-auto custom-scrollbar">
                {filtered.map((cmd, idx) => (
                    <button
                        key={cmd.id}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={() => onSelect(cmd.label, cmd.action)}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-300",
                            idx === selectedIndex ? "bg-electric-purple/10 text-white" : "text-slate-grey hover:bg-white/[0.03]"
                        )}
                    >
                        <div className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-300",
                            idx === selectedIndex ? "border-electric-purple/40 bg-electric-purple/20 text-electric-purple shadow-[0_0_15px_rgba(189,0,255,0.2)]" : "border-white/5 bg-white/[0.03]"
                        )}>
                            <cmd.icon className={cn("w-3.5 h-3.5", idx === selectedIndex && "drop-shadow-[0_0_8px_rgba(189,0,255,0.6)]")} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <span className="text-sm font-mono font-medium">{cmd.label}</span>
                            <span className="text-xs text-slate-grey ml-2">{cmd.description}</span>
                        </div>
                        {idx === selectedIndex && (
                            <span className="text-[10px] font-mono text-electric-purple/80 px-1.5 py-0.5 rounded bg-electric-purple/10 border border-electric-purple/20">Enter</span>
                        )}
                    </button>
                ))}
            </div>
        </motion.div>
    );
}
