import { useState, useEffect, type RefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface ScrollToBottomProps {
    scrollRef: RefObject<HTMLElement | null>;
    messagesEndRef: RefObject<HTMLElement | null>;
}

export function ScrollToBottom({ scrollRef, messagesEndRef }: ScrollToBottomProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const target = messagesEndRef.current;
        if (!target) return;
        const observer = new IntersectionObserver(([entry]) => setIsVisible(!entry.isIntersecting), { threshold: 0.1 });
        observer.observe(target);
        return () => observer.disconnect();
    }, [messagesEndRef]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 10 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
                    className="absolute bottom-24 right-6 z-30 w-10 h-10 rounded-full glass-panel flex items-center justify-center text-slate-grey hover:text-neurix-orange hover:border-neurix-orange/30 hover:shadow-[0_0_15px_rgba(255,85,0,0.1)] transition-all shadow-lg"
                    aria-label="Scroll to bottom"
                >
                    <ChevronDown className="w-5 h-5" />
                </motion.button>
            )}
        </AnimatePresence>
    );
}
