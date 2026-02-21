import { motion } from 'framer-motion';
import { Plug, ArrowRight, Check, Loader2, Unplug } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectButtonProps {
    connected: boolean;
    loading?: boolean;
    onConnect: () => void;
    onDisconnect?: () => void;
    size?: 'sm' | 'md';
    className?: string;
    showDisconnect?: boolean;
}

export function ConnectButton({
    connected,
    loading = false,
    onConnect,
    onDisconnect,
    size = 'sm',
    className,
    showDisconnect = false,
}: ConnectButtonProps): React.ReactElement {
    const isSm = size === 'sm';

    if (connected && showDisconnect && onDisconnect) {
        return (
            <button
                onClick={onDisconnect}
                className={cn(
                    "group relative inline-flex items-center justify-center gap-1.5 rounded-lg border border-destructive/30 text-destructive font-medium transition-all",
                    "hover:bg-destructive/10 hover:border-destructive/50",
                    isSm ? "h-7 px-3 text-xs" : "h-9 px-4 text-sm",
                    className,
                )}
            >
                <Unplug className={cn(isSm ? "w-3 h-3" : "w-3.5 h-3.5")} />
                Disconnect
            </button>
        );
    }

    if (connected) {
        return (
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg font-medium",
                    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
                    isSm ? "h-7 px-3 text-xs" : "h-9 px-4 text-sm",
                    className,
                )}
            >
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
                >
                    <Check className={cn(isSm ? "w-3 h-3" : "w-3.5 h-3.5")} />
                </motion.div>
                Connected
            </motion.div>
        );
    }

    if (loading) {
        return (
            <div
                className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg font-medium border border-orange-300/50 dark:border-neural-energy/30 text-orange-600 dark:text-neural-energy bg-orange-50 dark:bg-neural-energy/10",
                    isSm ? "h-7 px-3 text-xs" : "h-9 px-4 text-sm",
                    className,
                )}
            >
                <Loader2 className={cn("animate-spin", isSm ? "w-3 h-3" : "w-3.5 h-3.5")} />
                Connecting...
            </div>
        );
    }

    return (
        <motion.button
            onClick={onConnect}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
                "group relative inline-flex items-center gap-1.5 rounded-lg font-medium border transition-all overflow-hidden",
                "border-orange-400/60 dark:border-neural-energy/40 text-orange-600 dark:text-neural-energy",
                "hover:text-white hover:border-transparent",
                isSm ? "h-7 px-3 text-xs" : "h-9 px-4 text-sm",
                className,
            )}
        >
            {/* Hover background fill */}
            <span className="absolute inset-0 bg-gradient-to-r from-orange-500 to-rose-500 dark:from-neural-energy dark:to-deep-reasoning opacity-0 group-hover:opacity-100 transition-opacity" />

            <span className="relative flex items-center gap-1.5">
                <Plug className={cn(isSm ? "w-3 h-3" : "w-3.5 h-3.5")} />
                Connect
                <ArrowRight className={cn(
                    "transition-transform group-hover:translate-x-0.5",
                    isSm ? "w-3 h-3" : "w-3.5 h-3.5",
                )} />
            </span>
        </motion.button>
    );
}
