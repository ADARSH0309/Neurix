import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface SuggestionChipsProps {
    suggestions: string[];
    onSelect: (text: string) => void;
}

export function SuggestionChips({ suggestions, onSelect }: SuggestionChipsProps) {
    if (!suggestions.length) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2.5 flex-wrap max-w-3xl mx-auto px-12 mt-3"
        >
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest mr-1">
                <Sparkles className="w-3 h-3 text-neurix-orange/40" />
                <span>Suggested</span>
            </div>
            {suggestions.slice(0, 3).map((suggestion, idx) => (
                <motion.button
                    key={suggestion}
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.25, delay: idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ scale: 1.04, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onSelect(suggestion)}
                    className="px-3.5 py-2 rounded-xl text-xs font-mono font-medium border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-neurix-orange/10 hover:border-neurix-orange/25 transition-all duration-200"
                >
                    {suggestion}
                </motion.button>
            ))}
        </motion.div>
    );
}
