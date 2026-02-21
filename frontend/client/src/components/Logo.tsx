import { cn } from '@/lib/utils';

interface LogoProps {
    className?: string;
    showText?: boolean;
}

export function Logo({ className, showText = true }: LogoProps) {
    return (
        <div className={cn("flex items-center gap-2.5 select-none", className)}>
            <div className="relative w-8 h-8 flex items-center justify-center">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-primary/20 rounded-lg blur-lg" />

                {/* Logo Container */}
                <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-gray-900 to-black border border-white/10 flex items-center justify-center shadow-lg overflow-hidden group">
                    {/* Neural Nodes SVG */}
                    <svg
                        viewBox="0 0 32 32"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-5 h-5 text-primary z-10"
                    >
                        <circle cx="16" cy="16" r="3" fill="currentColor" className="animate-pulse" />
                        <circle cx="16" cy="6" r="2" fill="#7C3AED" className="opacity-80" />
                        <circle cx="26" cy="22" r="2" fill="#7C3AED" className="opacity-80" />
                        <circle cx="6" cy="22" r="2" fill="#7C3AED" className="opacity-80" />

                        {/* Connections */}
                        <path d="M16 9L16 13" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" />
                        <path d="M24.5 20.5L18.5 17.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" />
                        <path d="M7.5 20.5L13.5 17.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" />
                    </svg>

                    {/* Scanline effect */}
                    <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/5 to-transparent -translate-y-[100%] group-hover:translate-y-[100%] transition-transform duration-1000 ease-in-out" />
                </div>
            </div>

            {showText && (
                <div className="flex flex-col">
                    <span className="text-lg font-heading font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-[#FF7A33] to-secondary tracking-tight leading-none">
                        Neurix
                    </span>
                    <span className="text-[9px] font-mono text-muted-foreground/60 tracking-[0.2em] leading-none mt-0.5">
                        INTELLIGENCE
                    </span>
                </div>
            )}
        </div>
    );
}
