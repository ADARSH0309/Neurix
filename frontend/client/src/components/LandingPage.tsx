import { useState, useEffect, useRef, useCallback, forwardRef } from 'react';
import { motion, useScroll, useTransform, useInView, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import {
    Brain,
    ArrowRight,
    FormInput,
    Shield,
    Zap,
    Lock,
    Globe,
    Github,
    CheckCircle2,
    Layers,
    Database,
    Bot,
    FileJson,
    Moon,
    Sun,
    MessageSquare,
    Search,
    Share2,
    Menu,
    X,
    FileText,
    FolderOpen,
    RefreshCw,
    Download,
    Eye,
    Send,
    ChevronRight,
    Activity,
    KeyRound,
    Plug,
    Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { BorderBeam } from '@/components/ui/border-beam';
import { Marquee } from '@/components/ui/marquee';
import { Dock, DockIcon } from '@/components/ui/dock';
import { AnimatedBeamDemo } from './AnimatedBeamDemo';
import { FlipCardDemo } from '@/components/ui/flip-card';

interface LandingPageProps {
    onGetStarted: () => void;
}

// ===== ENHANCED HELPER COMPONENTS =====

// Floating Particles - Animated background orbs (reserved for future use)
function _FloatingParticles({ count = 20, isDark }: { count?: number; isDark: boolean }): React.ReactElement {
    const particles = Array.from({ length: count }, (_, i) => ({
        id: i,
        size: Math.random() * 4 + 2,
        x: Math.random() * 100,
        y: Math.random() * 100,
        duration: Math.random() * 10 + 10,
        delay: Math.random() * 5,
    }));

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map((particle) => (
                <motion.div
                    key={particle.id}
                    className={cn(
                        "absolute rounded-full",
                        isDark ? "bg-neural-energy/30" : "bg-orange-400/20"
                    )}
                    style={{
                        width: particle.size,
                        height: particle.size,
                        left: `${particle.x}%`,
                        top: `${particle.y}%`,
                    }}
                    animate={{
                        y: [0, -30, 0],
                        x: [0, Math.random() * 20 - 10, 0],
                        opacity: [0.3, 0.8, 0.3],
                        scale: [1, 1.2, 1],
                    }}
                    transition={{
                        duration: particle.duration,
                        delay: particle.delay,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            ))}
        </div>
    );
}

// 3D Tilt Card - Interactive card with perspective tilt (reserved for future use)
function _TiltCard({
    children,
    className,
    glowColor = "rgba(99, 102, 241, 0.3)",
    showBorderBeam = false,
    borderBeamColors,
}: {
    children: React.ReactNode;
    className?: string;
    glowColor?: string;
    showBorderBeam?: boolean;
    borderBeamColors?: { from: string; to: string };
}): React.ReactElement {
    const ref = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseXSpring = useSpring(x, { stiffness: 500, damping: 100 });
    const mouseYSpring = useSpring(y, { stiffness: 500, damping: 100 });

    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const xPct = mouseX / width - 0.5;
        const yPct = mouseY / height - 0.5;
        x.set(xPct);
        y.set(yPct);
    }, [x, y]);

    const handleMouseLeave = useCallback(() => {
        setIsHovered(false);
        x.set(0);
        y.set(0);
    }, [x, y]);

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
            style={{
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
            }}
            className={cn("perspective-1000 transform-gpu relative", className)}
        >
            <div
                style={{
                    transform: "translateZ(50px)",
                    transformStyle: "preserve-3d",
                }}
                className="relative overflow-hidden rounded-2xl"
            >
                {children}
                {showBorderBeam && (
                    <>
                        <BorderBeam
                            size={250}
                            duration={12}
                            delay={0}
                            colorFrom={borderBeamColors?.from || "#6366f1"}
                            colorTo={borderBeamColors?.to || "#a855f7"}
                        />
                        <BorderBeam
                            size={250}
                            duration={12}
                            delay={6}
                            colorFrom={borderBeamColors?.to || "#a855f7"}
                            colorTo={borderBeamColors?.from || "#6366f1"}
                        />
                    </>
                )}
            </div>
            {isHovered && (
                <motion.div
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                        background: `radial-gradient(circle at ${(x.get() + 0.5) * 100}% ${(y.get() + 0.5) * 100}%, ${glowColor}, transparent 50%)`,
                    }}
                />
            )}
        </motion.div>
    );
}

// Magnetic Button - Button that follows cursor slightly (reserved for future use)
function _MagneticButton({
    children,
    className,
    onClick,
}: {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}): React.ReactElement {
    const ref = useRef<HTMLButtonElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        x.set((e.clientX - centerX) * 0.15);
        y.set((e.clientY - centerY) * 0.15);
    }, [x, y]);

    const handleMouseLeave = useCallback(() => {
        x.set(0);
        y.set(0);
    }, [x, y]);

    const springX = useSpring(x, { stiffness: 300, damping: 30 });
    const springY = useSpring(y, { stiffness: 300, damping: 30 });

    return (
        <motion.button
            ref={ref}
            style={{ x: springX, y: springY }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={onClick}
            className={cn("magnetic-btn", className)}
        >
            {children}
        </motion.button>
    );
}

// Status Ticker - Horizontal scrolling status bar (reserved for future use)
function _StatusTicker({ isDark }: { isDark: boolean }): React.ReactElement {
    const items = [
        { type: 'LIVE', text: '30+ MCP tools ready' },
        { type: 'SECURE', text: 'OAuth 2.0 authenticated' },
        { type: 'ACTIVE', text: '6 integrations available' },
        { type: 'REALTIME', text: 'Streaming responses' },
    ];

    return (
        <div className="relative w-full max-w-2xl mx-auto py-4">
            <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
            <Marquee pauseOnHover className="[--duration:25s]">
                {items.map((item, idx) => (
                    <div key={idx} className="inline-flex items-center gap-2 mx-6 font-mono text-xs text-muted-foreground">
                        <span className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-bold",
                            item.type === 'LIVE' && (isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'),
                            item.type === 'SECURE' && (isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'),
                            item.type === 'ACTIVE' && (isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'),
                            item.type === 'REALTIME' && (isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'),
                        )}>
                            [{item.type}]
                        </span>
                        {item.text}
                        <span className="text-muted-foreground/40">·</span>
                    </div>
                ))}
            </Marquee>
        </div>
    );
}

// System Meter - Animated vertical bars (reserved for future use)
function _SystemMeter({ active = true }: { active?: boolean }): React.ReactElement {
    return (
        <div className="system-meter">
            {[1, 2, 3, 4, 5].map((i) => (
                <div
                    key={i}
                    className={cn(
                        "system-meter-bar",
                        !active && "opacity-30"
                    )}
                    style={{
                        animationPlayState: active ? 'running' : 'paused',
                    }}
                />
            ))}
        </div>
    );
}

// HUD Frame - Decorative wrapper with corner brackets (reserved for future use)
function _HUDFrame({
    children,
    label,
    indicator,
    className,
}: {
    children: React.ReactNode;
    label?: string;
    indicator?: string;
    className?: string;
}): React.ReactElement {
    return (
        <div className={cn("relative", className)}>
            {/* Corner brackets */}
            <div className="hud-corner-tl" />
            <div className="hud-corner-tr" />
            <div className="hud-corner-bl" />
            <div className="hud-corner-br" />

            {/* Labels */}
            {label && (
                <div className="absolute -top-3 left-8 px-2 bg-background text-technical text-[10px]">
                    {label}
                </div>
            )}
            {indicator && (
                <div className="absolute -top-3 right-8 px-2 bg-background flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-technical text-[10px] text-red-400">{indicator}</span>
                </div>
            )}

            {children}
        </div>
    );
}

// Morphing Blob - Organic animated shape (reserved for future use)
function _MorphingBlob({ className, color }: { className?: string; color: string }): React.ReactElement {
    return (
        <motion.div
            className={cn("absolute animate-morph", className)}
            style={{ background: color }}
            animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 180, 360],
            }}
            transition={{
                duration: 20,
                repeat: Infinity,
                ease: "linear",
            }}
        />
    );
}



// Animated counter component
function _AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }): React.ReactElement {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true });

    useEffect(() => {
        if (!isInView) return;

        let start = 0;
        const duration = 2000;
        const increment = target / (duration / 16);

        const timer = setInterval(() => {
            start += increment;
            if (start >= target) {
                setCount(target);
                clearInterval(timer);
            } else {
                setCount(Math.floor(start));
            }
        }, 16);

        return () => clearInterval(timer);
    }, [isInView, target]);

    return (
        <div ref={ref} className="text-3xl md:text-4xl font-bold font-heading">
            {count}{suffix}
        </div>
    );
}

// Section wrapper with scroll animation
function Section({
    children,
    className,
    id,
    ariaLabel,
}: {
    children: React.ReactNode;
    className?: string;
    id?: string;
    ariaLabel?: string;
}): React.ReactElement {
    return (
        <motion.section
            id={id}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className={className}
            aria-label={ariaLabel}
        >
            {children}
        </motion.section>
    );
}

// Stagger container for card grids (reserved for future use)
const _staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.12 },
    },
};

const _staggerChild = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0, 0, 0.2, 1] as const } },
};

// Theme colors for light/dark
const getThemeColors = (isDark: boolean) => ({
    ctaGradient: 'from-orange-500 to-rose-500',
    ctaGradientHover: 'hover:from-orange-600 hover:to-rose-600',
    ctaShadow: isDark ? 'shadow-orange-500/20' : 'shadow-orange-500/30',
    logoGradient: isDark ? 'from-neural-energy to-deep-reasoning' : 'from-orange-500 to-rose-500',
    textGradient: isDark
        ? 'from-neural-energy via-indigo-400 to-deep-reasoning'
        : 'from-orange-500 via-rose-500 to-pink-500',
    badgeBg: isDark ? 'bg-neural-energy/10' : 'bg-orange-50',
    badgeBorder: isDark ? 'border-neural-energy/20' : 'border-orange-200',
    badgeText: isDark ? 'text-neural-energy' : 'text-orange-600',
    cardBg: isDark ? 'bg-card' : 'bg-white',
    cardBorder: isDark ? 'border-border' : 'border-gray-200',
    cardHover: isDark ? 'hover:border-neural-energy/30' : 'hover:border-orange-300',
    altBg: isDark ? 'bg-card/50' : 'bg-gray-50/80',
    blobColor1: isDark ? 'bg-neural-energy/15' : 'bg-orange-200/40',
    blobColor2: isDark ? 'bg-deep-reasoning/15' : 'bg-rose-200/40',
    accentText: isDark ? 'text-neural-energy' : 'text-orange-600',
    accentBg: isDark ? 'bg-neural-energy' : 'bg-orange-500',
    statGradient: isDark ? 'from-neural-energy to-deep-reasoning' : 'from-orange-500 to-rose-500',
});

export function LandingPage({ onGetStarted }: LandingPageProps): React.ReactElement {
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('theme');
            if (stored) return stored as 'light' | 'dark';
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return 'dark';
    });
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const isDark = theme === 'dark';
    const _colors = getThemeColors(isDark);

    const { scrollY } = useScroll();
    const _heroOpacity = useTransform(scrollY, [0, 500], [1, 0]);
    const _heroScale = useTransform(scrollY, [0, 500], [1, 0.96]);
    const _heroY = useTransform(scrollY, [0, 500], [0, 100]);

    // Parallax for blobs (reserved for future use)
    const _blob1Y = useTransform(scrollY, [0, 1000], [0, -150]);
    const _blob2Y = useTransform(scrollY, [0, 1000], [0, -100]);

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        const handleScroll = (): void => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const toggleTheme = (): void => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const scrollToSection = (id: string): void => {
        setMobileMenuOpen(false);
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    const navLinks = [
        { label: 'Features', id: 'features' },
        { label: 'How It Works', id: 'how-it-works' },
        { label: 'Integrations', id: 'integrations' },
        { label: 'Security', id: 'security' },
    ];

    return (
        <div className={cn(
            "min-h-screen bg-background text-foreground overflow-x-hidden",
            isDark && "noise-overlay"
        )}>
            {/* Skip to main content */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
            >
                Skip to main content
            </a>


            {/* ====== 1. NAVBAR - Editorial Tech ====== */}
            <nav
                className={cn(
                    "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
                    isScrolled
                        ? cn(
                            "backdrop-blur-md shadow-lg",
                            isDark ? "bg-[#1A1A1A]/95" : "bg-white/95"
                        )
                        : "bg-transparent"
                )}
                role="navigation"
                aria-label="Main navigation"
            >
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        {/* Logo - Serif Typography */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#FF5500] flex items-center justify-center">
                                <Brain className="w-5 h-5 text-white" aria-hidden="true" />
                            </div>
                            <span className={cn(
                                "text-2xl font-serif-display font-bold tracking-tight",
                                isDark ? "text-white" : "text-[#1A1A1A]"
                            )}>
                                Neurix
                            </span>
                        </div>

                        {/* Desktop nav links */}
                        <div className="hidden md:flex items-center gap-10">
                            {navLinks.map((link) => (
                                <button
                                    key={link.id}
                                    onClick={() => scrollToSection(link.id)}
                                    className={cn(
                                        "font-medium transition-colors flex items-center gap-1 relative group",
                                        isDark
                                            ? "text-white hover:text-primary"
                                            : "text-[#1A1A1A] hover:text-primary"
                                    )}
                                    style={{ fontSize: '16px', fontFamily: 'Questrial, sans-serif' }}
                                >
                                    {link.label}
                                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#FF5500] transition-all group-hover:w-full" />
                                </button>
                            ))}
                        </div>

                        {/* Right side */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={toggleTheme}
                                className={cn(
                                    "p-2.5 rounded-full transition-all",
                                    isDark
                                        ? "text-white/70 hover:text-white hover:bg-white/10"
                                        : "text-[#1A1A1A]/70 hover:text-[#1A1A1A] hover:bg-black/5"
                                )}
                                aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                            >
                                {isDark ? (
                                    <Sun className="h-5 w-5" aria-hidden="true" />
                                ) : (
                                    <Moon className="h-5 w-5" aria-hidden="true" />
                                )}
                            </button>
                            <button
                                onClick={onGetStarted}
                                className={cn(
                                    "hidden sm:inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold font-sans-body transition-all",
                                    isDark
                                        ? "bg-[#FF5500] text-white hover:bg-[#FF7A33] hover:scale-105"
                                        : "bg-[#1A1A1A] text-white hover:bg-[#333333] hover:scale-105"
                                )}
                            >
                                Get Started
                                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </button>
                            {/* Mobile hamburger */}
                            <button
                                className={cn(
                                    "md:hidden p-2.5 rounded-full transition-colors",
                                    isDark
                                        ? "text-white/70 hover:text-white hover:bg-white/10"
                                        : "text-[#1A1A1A]/70 hover:text-[#1A1A1A] hover:bg-black/5"
                                )}
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                aria-label="Toggle menu"
                                aria-expanded={mobileMenuOpen}
                            >
                                {mobileMenuOpen ? (
                                    <X className="h-5 w-5" aria-hidden="true" />
                                ) : (
                                    <Menu className="h-5 w-5" aria-hidden="true" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile menu */}
                <AnimatePresence>
                    {mobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className={cn(
                                "md:hidden overflow-hidden",
                                isDark ? "bg-[#1A1A1A]" : "bg-white"
                            )}
                        >
                            <div className="px-6 py-6 space-y-2">
                                {navLinks.map((link) => (
                                    <button
                                        key={link.id}
                                        onClick={() => scrollToSection(link.id)}
                                        className={cn(
                                            "block w-full text-left px-4 py-3 rounded-xl font-medium transition-colors",
                                            isDark
                                                ? "text-white hover:text-primary hover:bg-white/10"
                                                : "text-[#1A1A1A] hover:text-primary hover:bg-[#F5F5F5]"
                                        )}
                                        style={{ fontSize: '16px', fontFamily: 'Questrial, sans-serif' }}
                                    >
                                        {link.label}
                                    </button>
                                ))}
                                <button
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        onGetStarted();
                                    }}
                                    className="w-full mt-4 px-6 py-3 rounded-full text-base font-semibold font-sans-body bg-[#FF5500] text-white hover:bg-[#FF7A33] transition-colors"
                                >
                                    Get Started
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>

            <main id="main-content">
                {/* ====== 2. HERO - Editorial Tech Orange Background ====== */}
                <section
                    className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden bg-[#FF5500]"
                    aria-labelledby="hero-heading"
                >
                    {/* Decorative gradient overlay */}
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#FF5500] via-[#FF7A33] to-[#FF5500]" />
                        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/10 to-transparent" />
                    </div>

                    <div className="relative z-10 max-w-5xl mx-auto px-6 lg:px-8">
                        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                            {/* Left: Content */}
                            <motion.div
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.6 }}
                                className="text-center lg:text-left"
                            >
                                {/* Badge */}
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium font-sans-body mb-8 bg-white/20 text-white backdrop-blur-sm">
                                    <Sparkles className="w-4 h-4" />
                                    Powered by MCP Protocol
                                </div>

                                {/* Headline - Serif */}
                                <h1 id="hero-heading" className="mb-6">
                                    <span className="block text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-serif-display font-bold tracking-tight leading-[1.05] text-white">
                                        Connect your
                                    </span>
                                    <span className="block text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-serif-display font-bold tracking-tight leading-[1.05] text-[#1A1A1A] mt-1">
                                        workspace.
                                    </span>
                                </h1>

                                {/* Subtitle */}
                                <p className="text-lg sm:text-xl max-w-lg mx-auto lg:mx-0 mb-10 leading-relaxed font-sans-body text-white/90">
                                    One chat interface to manage Google Drive, Forms, GitHub, and more through natural conversation.
                                </p>

                                {/* CTA Buttons - Pill Style */}
                                <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4">
                                    <button
                                        onClick={onGetStarted}
                                        className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-base font-semibold font-sans-body transition-all bg-[#1A1A1A] text-white hover:bg-[#333333] hover:scale-105 shadow-xl"
                                    >
                                        Sign in with Google
                                        <ArrowRight className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                    <button
                                        onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                                        className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-base font-semibold font-sans-body transition-all bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
                                    >
                                        Learn More
                                    </button>
                                </div>
                            </motion.div>

                            {/* Right: Context Cards with Spring Animation */}
                            <div className="hidden lg:block">
                                <div className="space-y-5">
                                    {/* Stat Card - Large Serif Number */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.3 }}
                                        className="context-card-white p-8"
                                    >
                                        <div className="text-7xl font-serif-display text-[#0F0F0F] mb-2 tracking-tight">40%</div>
                                        <div className="text-base font-sans-body text-[#0F0F0F]/60">Time saved on file management</div>
                                    </motion.div>

                                    {/* Recent Updates Card */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.45 }}
                                        className="context-card-white p-6"
                                    >
                                        <div className="flex justify-between items-center mb-5">
                                            <h3 className="text-2xl font-serif-display text-[#0F0F0F] tracking-tight">Recent updates</h3>
                                            <div className="icon-circle-orange w-10 h-10 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                                                <ArrowRight className="w-4 h-4 text-white" />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            {[
                                                { name: "Project files uploaded", time: "2m ago", icon: FolderOpen },
                                                { name: "Form responses synced", time: "5m ago", icon: FormInput },
                                                { name: "GitHub issues updated", time: "12m ago", icon: CheckCircle2 },
                                            ].map((item, i) => (
                                                <div key={i} className="list-item-hover flex items-center gap-3 p-3 -mx-3">
                                                    <div className="icon-circle shrink-0">
                                                        <item.icon className="w-4 h-4 text-white" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="text-sm font-sans-medium text-[#0F0F0F]">{item.name}</div>
                                                        <div className="text-xs font-sans-body text-[#0F0F0F]/40">{item.time}</div>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-[#0F0F0F]/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>

                                    {/* Project Milestones - Dark Card */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.6 }}
                                        className="context-card-dark p-6"
                                    >
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-xl font-serif-display text-white tracking-tight">Project milestones</h3>
                                            <span className="text-sm font-sans-body text-white/40">3/5</span>
                                        </div>
                                        <div className="progress-segments">
                                            {[1, 2, 3, 4, 5].map((_, i) => (
                                                <div key={i} className={cn("progress-segment", i < 3 && "active")} />
                                            ))}
                                        </div>
                                        <div className="mt-4 text-sm font-sans-body text-white/50">On track for launch</div>
                                    </motion.div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Scroll indicator */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
                        <motion.div
                            animate={{ y: [0, 8, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                            className="w-6 h-10 rounded-full border-2 border-white/50 flex items-start justify-center p-1.5"
                        >
                            <div className="w-1.5 h-2 rounded-full bg-white/70" />
                        </motion.div>
                    </div>
                </section>

                {/* ====== 3. FEATURE SHOWCASE - Editorial Tech Design ====== */}
                <Section id="features" className={cn("py-24 lg:py-32 px-4 sm:px-6 lg:px-8", isDark ? "bg-[#1A1A1A]" : "bg-[#F5F5F5]")} ariaLabel="Feature Showcase">
                    <div className="max-w-7xl mx-auto">
                        {/* Editorial header */}
                        <motion.div
                            className="text-center mb-16 lg:mb-20"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5 }}
                        >
                            <p className="text-sm font-semibold font-sans-body tracking-widest uppercase mb-4 text-[#FF5500]">
                                Features
                            </p>
                            <h2 className={cn(
                                "text-4xl sm:text-5xl lg:text-6xl font-serif-display font-bold tracking-tight mb-6",
                                isDark ? "text-white" : "text-[#1A1A1A]"
                            )}>
                                Everything you need,
                                <br />
                                <span className={isDark ? "text-white/50" : "text-[#1A1A1A]/50"}>nothing you don&apos;t.</span>
                            </h2>
                            <p className={cn(
                                "text-lg font-sans-body max-w-xl mx-auto",
                                isDark ? "text-white/60" : "text-[#1A1A1A]/60"
                            )}>
                                Simple, powerful tools that work together seamlessly.
                            </p>
                        </motion.div>

                        {/* Editorial Tech feature grid */}
                        <div className="grid lg:grid-cols-2 gap-8 lg:gap-10">
                            {/* Feature 1: Unified Chat */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                                className="group"
                            >
                                <div className={cn(
                                    "editorial-card rounded-[20px] p-8 h-full transition-all duration-300",
                                    isDark
                                        ? "bg-[#2A2A2A] hover:shadow-[0_20px_60px_rgba(255,85,0,0.15)]"
                                        : "bg-white hover:shadow-[0_20px_60px_rgba(0,0,0,0.1)]"
                                )}>
                                    <div className="w-14 h-14 rounded-2xl bg-[#FF5500] flex items-center justify-center mb-6">
                                        <MessageSquare className="w-7 h-7 text-white" />
                                    </div>

                                    <h3 className={cn(
                                        "text-2xl font-serif-display font-bold mb-3",
                                        isDark ? "text-white" : "text-[#1A1A1A]"
                                    )}>
                                        Unified Chat Interface
                                    </h3>

                                    <p className={cn(
                                        "text-base font-sans-body mb-6 leading-relaxed",
                                        isDark ? "text-white/60" : "text-[#1A1A1A]/60"
                                    )}>
                                        One conversation to control all your services. Switch between Drive, Forms, and GitHub naturally.
                                    </p>

                                    {/* Chat preview */}
                                    <div className={cn(
                                        "rounded-2xl p-5 space-y-4",
                                        isDark ? "bg-[#1A1A1A]" : "bg-[#F5F5F5]"
                                    )}>
                                        <div className="flex gap-3 items-start">
                                            <div className="w-9 h-9 rounded-full bg-[#FF5500] flex items-center justify-center shrink-0">
                                                <Bot className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="chat-bubble-ai font-sans-body">
                                                Found <span className="font-semibold">15 files</span> matching &quot;report&quot;
                                            </div>
                                        </div>
                                        <div className="flex gap-3 items-start justify-end">
                                            <div className="chat-bubble-user font-sans-body">
                                                Check my GitHub issues
                                            </div>
                                        </div>
                                        <div className="flex gap-3 items-start">
                                            <div className="w-9 h-9 rounded-full bg-[#FF5500] flex items-center justify-center shrink-0">
                                                <Bot className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="chat-bubble-ai font-sans-body flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                <span><span className="font-semibold">3 open</span> issues assigned to you</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Feature 2: 30+ Tools */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="group"
                            >
                                <div className={cn(
                                    "editorial-card rounded-[20px] p-8 h-full transition-all duration-300",
                                    isDark
                                        ? "bg-[#2A2A2A] hover:shadow-[0_20px_60px_rgba(255,85,0,0.15)]"
                                        : "bg-white hover:shadow-[0_20px_60px_rgba(0,0,0,0.1)]"
                                )}>
                                    <div className="w-14 h-14 rounded-2xl bg-[#1A1A1A] flex items-center justify-center mb-6">
                                        <Layers className="w-7 h-7 text-white" />
                                    </div>

                                    <h3 className={cn(
                                        "text-2xl font-serif-display font-bold mb-3",
                                        isDark ? "text-white" : "text-[#1A1A1A]"
                                    )}>
                                        30+ MCP Tools
                                    </h3>

                                    <p className={cn(
                                        "text-base font-sans-body mb-6 leading-relaxed",
                                        isDark ? "text-white/60" : "text-[#1A1A1A]/60"
                                    )}>
                                        Full-featured integrations across Google Drive, Forms, Gmail, GitHub, Slack, and more.
                                    </p>

                                    {/* Tool grid */}
                                    <div className="grid grid-cols-4 gap-3">
                                        {[
                                            { icon: Search, label: "Search" },
                                            { icon: FolderOpen, label: "Files" },
                                            { icon: Share2, label: "Share" },
                                            { icon: Download, label: "Export" },
                                            { icon: FileText, label: "Docs" },
                                            { icon: FormInput, label: "Forms" },
                                            { icon: Send, label: "Send" },
                                            { icon: Eye, label: "Preview" }
                                        ].map(({ icon: Icon, label }, i) => (
                                            <motion.div
                                                key={label}
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                whileInView={{ opacity: 1, scale: 1 }}
                                                viewport={{ once: true }}
                                                transition={{ delay: 0.3 + i * 0.05 }}
                                                className={cn(
                                                    "aspect-square rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer hover:scale-105",
                                                    isDark
                                                        ? "bg-[#1A1A1A] hover:bg-[#FF5500]/10"
                                                        : "bg-[#F5F5F5] hover:bg-[#FF5500]/10"
                                                )}
                                            >
                                                <Icon className={cn("w-5 h-5", isDark ? "text-white/70" : "text-[#1A1A1A]/70")} />
                                                <span className={cn("text-[10px] font-semibold font-sans-body", isDark ? "text-white/50" : "text-[#1A1A1A]/50")}>{label}</span>
                                            </motion.div>
                                        ))}
                                    </div>

                                    {/* Stats */}
                                    <div className={cn(
                                        "mt-6 pt-6 border-t flex items-center gap-8",
                                        isDark ? "border-white/10" : "border-[#1A1A1A]/10"
                                    )}>
                                        {[
                                            { value: "99.9%", label: "Uptime" },
                                            { value: "<100ms", label: "Latency" },
                                            { value: "24/7", label: "Support" }
                                        ].map(({ value, label }) => (
                                            <div key={label}>
                                                <div className={cn("text-xl font-serif-display font-bold", isDark ? "text-white" : "text-[#1A1A1A]")}>{value}</div>
                                                <div className={cn("text-xs font-sans-body", isDark ? "text-white/50" : "text-[#1A1A1A]/50")}>{label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>

                            {/* Feature 3: Forms Management */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: 0.3 }}
                                className="group"
                            >
                                <div className={cn(
                                    "editorial-card rounded-[20px] p-8 h-full transition-all duration-300",
                                    isDark
                                        ? "bg-[#2A2A2A] hover:shadow-[0_20px_60px_rgba(255,85,0,0.15)]"
                                        : "bg-white hover:shadow-[0_20px_60px_rgba(0,0,0,0.1)]"
                                )}>
                                    <div className="w-14 h-14 rounded-2xl bg-[#1A1A1A] flex items-center justify-center mb-6">
                                        <FormInput className="w-7 h-7 text-white" />
                                    </div>

                                    <h3 className={cn(
                                        "text-2xl font-serif-display font-bold mb-3",
                                        isDark ? "text-white" : "text-[#1A1A1A]"
                                    )}>
                                        Smart Forms
                                    </h3>

                                    <p className={cn(
                                        "text-base font-sans-body mb-6 leading-relaxed",
                                        isDark ? "text-white/60" : "text-[#1A1A1A]/60"
                                    )}>
                                        Create surveys, add questions, and analyze responses with AI assistance.
                                    </p>

                                    {/* Form preview */}
                                    <div className={cn(
                                        "rounded-2xl p-4 space-y-2",
                                        isDark ? "bg-[#1A1A1A]" : "bg-[#F5F5F5]"
                                    )}>
                                        <div className={cn(
                                            "text-sm font-sans-medium px-3 py-2 rounded-xl",
                                            isDark ? "bg-[#333333] text-white" : "bg-white text-[#1A1A1A]"
                                        )}>
                                            Customer Feedback
                                        </div>
                                        {["How would you rate us?", "Any suggestions?"].map((q, i) => (
                                            <div
                                                key={i}
                                                className={cn(
                                                    "text-sm font-sans-body px-3 py-2 rounded-xl flex items-center gap-2",
                                                    isDark ? "text-white/50" : "text-[#1A1A1A]/60"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-3 h-3 rounded-full border-2",
                                                    isDark ? "border-white/30" : "border-[#1A1A1A]/30"
                                                )} />
                                                {q}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Progress */}
                                    <div className="mt-6">
                                        <div className="flex justify-between text-sm font-sans-body mb-2">
                                            <span className={isDark ? "text-white/50" : "text-[#1A1A1A]/60"}>Response rate</span>
                                            <span className={cn("font-sans-medium", isDark ? "text-white" : "text-[#1A1A1A]")}>84%</span>
                                        </div>
                                        <div className={cn("h-2 rounded-full overflow-hidden", isDark ? "bg-[#333333]" : "bg-[#E5E5E5]")}>
                                            <motion.div
                                                className="h-full rounded-full bg-[#FF5500]"
                                                initial={{ width: 0 }}
                                                whileInView={{ width: "84%" }}
                                                viewport={{ once: true }}
                                                transition={{ duration: 1, delay: 0.5 }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Feature 4: Security */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: 0.4 }}
                                className="group"
                            >
                                <div className={cn(
                                    "editorial-card rounded-[20px] p-8 h-full transition-all duration-300",
                                    isDark
                                        ? "bg-[#2A2A2A] hover:shadow-[0_20px_60px_rgba(255,85,0,0.15)]"
                                        : "bg-white hover:shadow-[0_20px_60px_rgba(0,0,0,0.1)]"
                                )}>
                                    <div className="w-14 h-14 rounded-2xl bg-[#FF5500] flex items-center justify-center mb-6">
                                        <Shield className="w-7 h-7 text-white" />
                                    </div>

                                    <h3 className={cn(
                                        "text-2xl font-serif-display font-bold mb-3",
                                        isDark ? "text-white" : "text-[#1A1A1A]"
                                    )}>
                                        Enterprise Security
                                    </h3>

                                    <p className={cn(
                                        "text-base font-sans-body mb-6 leading-relaxed",
                                        isDark ? "text-white/60" : "text-[#1A1A1A]/60"
                                    )}>
                                        OAuth 2.0, encrypted sessions, and enterprise-grade infrastructure.
                                    </p>

                                    {/* Security features */}
                                    <div className="space-y-3">
                                        {[
                                            { icon: Lock, text: "End-to-end encryption" },
                                            { icon: KeyRound, text: "OAuth 2.0 authentication" },
                                            { icon: Database, text: "Redis session management" },
                                            { icon: RefreshCw, text: "Auto token refresh" }
                                        ].map(({ icon: Icon, text }, i) => (
                                            <motion.div
                                                key={text}
                                                initial={{ opacity: 0, x: -10 }}
                                                whileInView={{ opacity: 1, x: 0 }}
                                                viewport={{ once: true }}
                                                transition={{ delay: 0.4 + i * 0.1 }}
                                                className={cn(
                                                    "flex items-center gap-3 text-sm font-sans-body list-item-hover p-2 -mx-2",
                                                    isDark ? "text-white/60" : "text-[#1A1A1A]/60"
                                                )}
                                            >
                                                <div className="icon-circle w-9 h-9 shrink-0">
                                                    <Icon className="w-4 h-4 text-white" />
                                                </div>
                                                {text}
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </Section>

                {/* ====== 4. INTEGRATIONS - Editorial Tech ====== */}
                <Section id="integrations" className={cn("py-24 lg:py-32 px-4 sm:px-6 lg:px-8", isDark ? "bg-[#0F0F0F]" : "bg-[#F5F5F5]")} ariaLabel="Integrations">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-16">
                            <p className="text-sm font-semibold font-sans-body tracking-widest uppercase mb-4 text-[#FF5500]">
                                Integrations
                            </p>
                            <h2 className={cn(
                                "text-4xl sm:text-5xl font-serif-display font-bold tracking-tight mb-4",
                                isDark ? "text-white" : "text-[#1A1A1A]"
                            )}>
                                Connect your favorite tools
                            </h2>
                            <p className={cn(
                                "text-lg font-sans-body max-w-xl mx-auto",
                                isDark ? "text-white/60" : "text-[#1A1A1A]/60"
                            )}>
                                Seamless integrations with the services you already use.
                            </p>
                        </div>

                        <div className="w-full">
                            <AnimatedBeamDemo isDark={isDark} />
                        </div>
                    </div>
                </Section>

                {/* Community Spotlight Section */}
                <Section id="community" className="py-24 relative overflow-hidden">
                    <div className="container mx-auto px-4 relative z-10 flex flex-col items-center">
                        <div className="text-center max-w-2xl mx-auto mb-16">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                className={cn(
                                    "inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 border",
                                    _colors.badgeBg,
                                    _colors.badgeBorder,
                                    _colors.badgeText
                                )}
                            >
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
                                </span>
                                <span className="text-xs font-semibold tracking-wider uppercase">Community</span>
                            </motion.div>
                            <h2 className="text-3xl md:text-5xl font-bold font-heading mb-6 leading-tight">
                                Join our <span className={cn("text-transparent bg-clip-text bg-gradient-to-r", _colors.textGradient)}>Community</span>
                            </h2>
                            <p className="text-lg text-muted-foreground">
                                Connect with other developers and see what they are building with Neurix.
                            </p>
                        </div>

                        <FlipCardDemo />
                    </div>
                </Section>

                {/* ====== 5. CORE CAPABILITIES - Editorial Tech ====== */}
                <Section id="how-it-works" className={cn("py-24 lg:py-32 px-4 sm:px-6 lg:px-8", isDark ? "bg-[#1A1A1A]" : "bg-white")} ariaLabel="Core Capabilities">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <p className="text-sm font-semibold font-sans-body tracking-widest uppercase mb-4 text-[#FF5500]">
                                How It Works
                            </p>
                            <h2 className={cn(
                                "text-4xl sm:text-5xl font-serif-display font-bold tracking-tight mb-4",
                                isDark ? "text-white" : "text-[#1A1A1A]"
                            )}>
                                Core Capabilities
                            </h2>
                            <p className={cn(
                                "text-lg font-sans-body max-w-2xl mx-auto",
                                isDark ? "text-white/60" : "text-[#1A1A1A]/60"
                            )}>
                                Purpose-built for the Model Context Protocol with enterprise features
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6">
                            {/* MCP Native */}
                            <motion.div
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                className={cn(
                                    "editorial-card rounded-[20px] p-7 h-full transition-all duration-300",
                                    isDark
                                        ? "bg-[#2A2A2A] hover:shadow-[0_15px_50px_rgba(255,85,0,0.12)]"
                                        : "bg-[#F5F5F5] hover:shadow-[0_15px_50px_rgba(0,0,0,0.08)]"
                                )}
                            >
                                <div className="w-12 h-12 rounded-2xl bg-[#FF5500] flex items-center justify-center mb-5">
                                    <Layers className="w-6 h-6 text-white" aria-hidden="true" />
                                </div>
                                <h3 className={cn(
                                    "text-xl font-serif-display font-bold mb-3",
                                    isDark ? "text-white" : "text-[#1A1A1A]"
                                )}>Purpose-built for MCP</h3>
                                <p className={cn(
                                    "text-sm font-sans-body mb-5 leading-relaxed",
                                    isDark ? "text-white/60" : "text-[#1A1A1A]/60"
                                )}>
                                    Native Model Context Protocol support with JSON-RPC 2.0, tool discovery, and seamless AI integration.
                                </p>
                                <div className="flex gap-2 flex-wrap">
                                    {['JSON-RPC', 'Tool Discovery', 'STDIO + HTTP'].map((tag) => (
                                        <span
                                            key={tag}
                                            className={cn(
                                                "text-xs font-sans-medium px-3 py-1.5 rounded-full",
                                                isDark
                                                    ? "bg-[#1A1A1A] text-white/60"
                                                    : "bg-white text-[#1A1A1A]/60"
                                            )}
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </motion.div>

                            {/* Effortless Use */}
                            <motion.div
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                                className={cn(
                                    "editorial-card rounded-[20px] p-7 h-full transition-all duration-300",
                                    isDark
                                        ? "bg-[#2A2A2A] hover:shadow-[0_15px_50px_rgba(255,85,0,0.12)]"
                                        : "bg-[#F5F5F5] hover:shadow-[0_15px_50px_rgba(0,0,0,0.08)]"
                                )}
                            >
                                <div className="w-12 h-12 rounded-2xl bg-[#1A1A1A] flex items-center justify-center mb-5">
                                    <MessageSquare className="w-6 h-6 text-white" aria-hidden="true" />
                                </div>
                                <h3 className={cn(
                                    "text-xl font-serif-display font-bold mb-3",
                                    isDark ? "text-white" : "text-[#1A1A1A]"
                                )}>Built for Effortless Use</h3>
                                <p className={cn(
                                    "text-sm font-sans-body mb-5 leading-relaxed",
                                    isDark ? "text-white/60" : "text-[#1A1A1A]/60"
                                )}>
                                    Just type what you need. No complex APIs to learn.
                                </p>
                                <div className={cn(
                                    "rounded-2xl p-4 space-y-2 text-xs font-mono",
                                    isDark ? "bg-[#1A1A1A]" : "bg-white"
                                )}>
                                    {[
                                        '> List my recent files',
                                        '> Search for "Q4 report"',
                                        '> Create a feedback form',
                                    ].map((cmd, i) => (
                                        <div key={i} className={isDark ? "text-white/50" : "text-[#1A1A1A]/50"}>
                                            <span className="text-[#FF5500]">&gt;</span>{cmd.slice(1)}
                                        </div>
                                    ))}
                                </div>
                            </motion.div>

                            {/* Security */}
                            <motion.div
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                                id="security"
                                className={cn(
                                    "editorial-card rounded-[20px] p-7 h-full transition-all duration-300",
                                    isDark
                                        ? "bg-[#2A2A2A] hover:shadow-[0_15px_50px_rgba(255,85,0,0.12)]"
                                        : "bg-[#F5F5F5] hover:shadow-[0_15px_50px_rgba(0,0,0,0.08)]"
                                )}
                            >
                                <div className="w-12 h-12 rounded-2xl bg-[#FF5500] flex items-center justify-center mb-5">
                                    <Shield className="w-6 h-6 text-white" aria-hidden="true" />
                                </div>
                                <h3 className={cn(
                                    "text-xl font-serif-display font-bold mb-3",
                                    isDark ? "text-white" : "text-[#1A1A1A]"
                                )}>Engineered for Security</h3>
                                <p className={cn(
                                    "text-sm font-sans-body mb-5 leading-relaxed",
                                    isDark ? "text-white/60" : "text-[#1A1A1A]/60"
                                )}>
                                    Enterprise-grade protection with OAuth 2.0, encrypted sessions, and automatic token management.
                                </p>
                                <div className="space-y-2.5">
                                    {[
                                        { icon: Lock, text: 'OAuth 2.0 Authentication' },
                                        { icon: KeyRound, text: 'Auto Token Refresh' },
                                        { icon: Shield, text: 'Rate Limiting & Helmet' },
                                    ].map((item, i) => (
                                        <div key={i} className={cn(
                                            "flex items-center gap-2.5 text-sm font-sans-body",
                                            isDark ? "text-white/60" : "text-[#1A1A1A]/60"
                                        )}>
                                            <div className="w-6 h-6 rounded-lg bg-[#FF5500]/20 flex items-center justify-center">
                                                <item.icon className="w-3.5 h-3.5 text-[#FF5500]" aria-hidden="true" />
                                            </div>
                                            {item.text}
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </Section>

                {/* ====== 6. SCALABLE SOLUTIONS - Editorial Tech ====== */}
                <Section className={cn("py-24 lg:py-32 px-4 sm:px-6 lg:px-8", isDark ? "bg-[#0F0F0F]" : "bg-[#F5F5F5]")} ariaLabel="Scalable Solutions">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <p className="text-sm font-semibold font-sans-body tracking-widest uppercase mb-4 text-[#FF5500]">
                                Use Cases
                            </p>
                            <h2 className={cn(
                                "text-4xl sm:text-5xl font-serif-display font-bold tracking-tight mb-4",
                                isDark ? "text-white" : "text-[#1A1A1A]"
                            )}>
                                Scalable Solutions
                            </h2>
                            <p className={cn(
                                "text-lg font-sans-body max-w-2xl mx-auto",
                                isDark ? "text-white/60" : "text-[#1A1A1A]/60"
                            )}>
                                From file management to code reviews, handle it all through conversation
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            {/* Real-time File Operations */}
                            <motion.div
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                className={cn(
                                    "editorial-card rounded-[24px] p-8 h-full transition-all duration-300",
                                    isDark
                                        ? "bg-[#1A1A1A] hover:shadow-[0_20px_60px_rgba(255,85,0,0.15)]"
                                        : "bg-white hover:shadow-[0_20px_60px_rgba(0,0,0,0.1)]"
                                )}
                            >
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-[#FF5500] flex items-center justify-center">
                                        <Zap className="w-6 h-6 text-white" aria-hidden="true" />
                                    </div>
                                    <h3 className={cn(
                                        "text-xl font-serif-display font-bold",
                                        isDark ? "text-white" : "text-[#1A1A1A]"
                                    )}>
                                        Real-Time File Operations
                                    </h3>
                                </div>
                                <div className="space-y-3">
                                    {[
                                        { icon: FileText, name: 'Q4 Report.docx', status: 'Shared' },
                                        { icon: FolderOpen, name: 'Project Assets/', status: '24 files' },
                                        { icon: FileJson, name: 'config.json', status: 'Downloaded' },
                                    ].map((file, idx) => (
                                        <div
                                            key={idx}
                                            className={cn(
                                                "list-item-hover flex items-center gap-3 rounded-2xl px-4 py-3 transition-all",
                                                isDark
                                                    ? "bg-[#2A2A2A]"
                                                    : "bg-[#F5F5F5]"
                                            )}
                                        >
                                            <div className="icon-circle w-10 h-10 shrink-0">
                                                <file.icon className="w-5 h-5 text-white" aria-hidden="true" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className={cn("text-sm font-sans-medium truncate", isDark ? "text-white" : "text-[#1A1A1A]")}>{file.name}</div>
                                            </div>
                                            <span className="text-xs font-sans-body px-3 py-1 rounded-full bg-[#FF5500]/10 text-[#FF5500]">
                                                {file.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <p className={cn("text-sm font-sans-body mt-6", isDark ? "text-white/50" : "text-[#1A1A1A]/50")}>
                                    Upload, download, search, and share files instantly through chat commands.
                                </p>
                            </motion.div>

                            {/* Smart Form Management */}
                            <motion.div
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                                className={cn(
                                    "editorial-card rounded-[24px] p-8 h-full transition-all duration-300",
                                    isDark
                                        ? "bg-[#1A1A1A] hover:shadow-[0_20px_60px_rgba(255,85,0,0.15)]"
                                        : "bg-white hover:shadow-[0_20px_60px_rgba(0,0,0,0.1)]"
                                )}
                            >
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-[#1A1A1A] flex items-center justify-center">
                                        <FormInput className="w-6 h-6 text-white" aria-hidden="true" />
                                    </div>
                                    <h3 className={cn(
                                        "text-xl font-serif-display font-bold",
                                        isDark ? "text-white" : "text-[#1A1A1A]"
                                    )}>
                                        Smart Form Management
                                    </h3>
                                </div>
                                <div className={cn(
                                    "rounded-2xl p-5 space-y-4",
                                    isDark ? "bg-[#2A2A2A]" : "bg-[#F5F5F5]"
                                )}>
                                    <div className="flex items-center justify-between">
                                        <span className={cn("text-sm font-sans-medium", isDark ? "text-white" : "text-[#1A1A1A]")}>New Employee Onboarding</span>
                                        <span className="text-xs font-sans-body px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-500">
                                            Live
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        {['Full Name', 'Department', 'Start Date'].map((field, i) => (
                                            <div
                                                key={i}
                                                className={cn(
                                                    "rounded-xl px-4 py-3 text-sm font-sans-body flex items-center justify-between",
                                                    isDark ? "bg-[#1A1A1A]" : "bg-white"
                                                )}
                                            >
                                                <span className={isDark ? "text-white/60" : "text-[#1A1A1A]/60"}>{field}</span>
                                                <ChevronRight className={cn("w-4 h-4", isDark ? "text-white/30" : "text-[#1A1A1A]/30")} aria-hidden="true" />
                                            </div>
                                        ))}
                                    </div>
                                    <div className={cn("flex items-center gap-2 text-sm font-sans-body pt-2", isDark ? "text-white/50" : "text-[#1A1A1A]/50")}>
                                        <Activity className="w-4 h-4 text-[#FF5500]" aria-hidden="true" />
                                        <span>42 responses collected</span>
                                    </div>
                                </div>
                                <p className={cn("text-sm font-sans-body mt-6", isDark ? "text-white/50" : "text-[#1A1A1A]/50")}>
                                    Create forms, add questions dynamically, and analyze responses with AI.
                                </p>
                            </motion.div>
                        </div>
                    </div>
                </Section>

                {/* ====== 7. MORE FEATURES - Editorial Tech ====== */}
                <Section className={cn("py-24 lg:py-32 px-4 sm:px-6 lg:px-8", isDark ? "bg-[#1A1A1A]" : "bg-white")} ariaLabel="More Features">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <p className="text-sm font-semibold font-sans-body tracking-widest uppercase mb-4 text-[#FF5500]">
                                Reliability
                            </p>
                            <h2 className={cn(
                                "text-4xl sm:text-5xl font-serif-display font-bold tracking-tight mb-4",
                                isDark ? "text-white" : "text-[#1A1A1A]"
                            )}>
                                Built for Reliability
                            </h2>
                            <p className={cn(
                                "text-lg font-sans-body max-w-2xl mx-auto",
                                isDark ? "text-white/60" : "text-[#1A1A1A]/60"
                            )}>
                                Production-ready features designed for enterprise workloads
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6">
                            {[
                                {
                                    icon: RefreshCw,
                                    title: 'Circuit Breaker Resilience',
                                    description: 'Automatic failure detection with Opossum circuit breaker patterns. Graceful degradation keeps your workflow running.',
                                    iconBg: 'bg-[#FF5500]',
                                },
                                {
                                    icon: Database,
                                    title: 'Session Management',
                                    description: 'Redis-backed session storage with HTTP-only cookies. Secure, scalable, and persistent across requests.',
                                    iconBg: 'bg-[#1A1A1A]',
                                },
                                {
                                    icon: Download,
                                    title: 'Full File Export',
                                    description: 'Export Google Workspace files to PDF, DOCX, XLSX, and more. Download any file directly through the chat interface.',
                                    iconBg: 'bg-[#FF5500]',
                                },
                            ].map((feature, idx) => (
                                <motion.div
                                    key={feature.title}
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ type: "spring", stiffness: 200, damping: 15, delay: idx * 0.1 }}
                                    className={cn(
                                        "editorial-card rounded-[20px] p-7 h-full transition-all duration-300",
                                        isDark
                                            ? "bg-[#2A2A2A] hover:shadow-[0_15px_50px_rgba(255,85,0,0.12)]"
                                            : "bg-[#F5F5F5] hover:shadow-[0_15px_50px_rgba(0,0,0,0.08)]"
                                    )}
                                >
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center mb-5",
                                        feature.iconBg
                                    )}>
                                        <feature.icon className="w-6 h-6 text-white" aria-hidden="true" />
                                    </div>
                                    <h3 className={cn(
                                        "text-xl font-serif-display font-bold mb-3",
                                        isDark ? "text-white" : "text-[#1A1A1A]"
                                    )}>{feature.title}</h3>
                                    <p className={cn(
                                        "text-sm font-sans-body leading-relaxed",
                                        isDark ? "text-white/60" : "text-[#1A1A1A]/60"
                                    )}>{feature.description}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </Section>

                {/* ====== 8. PLATFORM PREVIEW - Editorial Tech ====== */}
                <Section className={cn("py-24 lg:py-32 px-4 sm:px-6 lg:px-8", isDark ? "bg-[#0F0F0F]" : "bg-[#F5F5F5]")} ariaLabel="Platform Preview">
                    <div className="max-w-5xl mx-auto">
                        <div className="text-center mb-12">
                            <p className="text-sm font-semibold font-sans-body tracking-widest uppercase mb-4 text-[#FF5500]">
                                Preview
                            </p>
                            <h2 className={cn(
                                "text-4xl sm:text-5xl font-serif-display font-bold tracking-tight mb-4",
                                isDark ? "text-white" : "text-[#1A1A1A]"
                            )}>
                                See Neurix in Action
                            </h2>
                            <p className={cn(
                                "text-lg font-sans-body max-w-2xl mx-auto",
                                isDark ? "text-white/60" : "text-[#1A1A1A]/60"
                            )}>
                                A clean, modern interface designed for productivity
                            </p>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 30, scale: 0.95 }}
                            whileInView={{ opacity: 1, y: 0, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ type: "spring", stiffness: 200, damping: 15 }}
                            className="relative"
                        >
                            {/* Browser chrome frame */}
                            <div className={cn(
                                "rounded-[24px] overflow-hidden shadow-2xl",
                                isDark ? "bg-[#1A1A1A] shadow-[0_30px_80px_rgba(0,0,0,0.5)]" : "bg-white shadow-[0_30px_80px_rgba(0,0,0,0.15)]"
                            )}>
                                {/* Title bar */}
                                <div className={cn(
                                    "h-12 flex items-center px-5 gap-2 border-b",
                                    isDark ? "bg-[#0F0F0F] border-[#2A2A2A]" : "bg-[#F5F5F5] border-[#E5E5E5]"
                                )}>
                                    <div className="flex gap-2">
                                        <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                                        <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                                        <div className="w-3 h-3 rounded-full bg-[#28C840]" />
                                    </div>
                                    <div className={cn(
                                        "flex-1 text-center text-xs font-sans-body",
                                        isDark ? "text-white/40" : "text-[#1A1A1A]/40"
                                    )}>
                                        localhost:5173
                                    </div>
                                </div>

                                {/* App mockup */}
                                <div className="flex h-[380px] sm:h-[440px]">
                                    {/* Sidebar */}
                                    <div className={cn(
                                        "w-56 shrink-0 border-r p-5 hidden sm:flex flex-col",
                                        isDark ? "bg-[#0F0F0F] border-[#2A2A2A]" : "bg-[#F5F5F5] border-[#E5E5E5]"
                                    )}>
                                        <div className="flex items-center gap-2.5 mb-6">
                                            <div className="w-8 h-8 rounded-xl bg-[#FF5500] flex items-center justify-center">
                                                <Brain className="w-4 h-4 text-white" aria-hidden="true" />
                                            </div>
                                            <span className={cn("text-sm font-serif-display font-bold", isDark ? "text-white" : "text-[#1A1A1A]")}>Neurix</span>
                                        </div>
                                        <div className="space-y-2 text-sm font-sans-body">
                                            {['Google Drive', 'Google Forms', 'GitHub', 'Slack'].map((item, i) => (
                                                <div
                                                    key={item}
                                                    className={cn(
                                                        "px-4 py-2.5 rounded-xl font-medium transition-colors",
                                                        i === 0
                                                            ? "bg-[#FF5500] text-white"
                                                            : (isDark ? "text-white/50 hover:text-white hover:bg-white/5" : "text-[#1A1A1A]/50 hover:text-[#1A1A1A] hover:bg-black/5"),
                                                        i === 3 && "opacity-50"
                                                    )}
                                                >
                                                    {item}
                                                </div>
                                            ))}
                                        </div>
                                        <div className={cn("mt-auto text-sm font-sans-body flex items-center gap-2", isDark ? "text-white/50" : "text-[#1A1A1A]/50")}>
                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                            3 Connected
                                        </div>
                                    </div>

                                    {/* Chat area */}
                                    <div className="flex-1 flex flex-col">
                                        {/* Chat header */}
                                        <div className={cn(
                                            "h-14 border-b flex items-center px-5 gap-3",
                                            isDark ? "border-[#2A2A2A]" : "border-[#E5E5E5]"
                                        )}>
                                            <div className="w-8 h-8 rounded-xl bg-[#FF5500]/10 flex items-center justify-center">
                                                <Plug className="w-4 h-4 text-[#FF5500]" aria-hidden="true" />
                                            </div>
                                            <span className={cn("text-sm font-sans-medium", isDark ? "text-white" : "text-[#1A1A1A]")}>All Services</span>
                                            <span className={cn("text-xs font-sans-body", isDark ? "text-white/40" : "text-[#1A1A1A]/40")}>30+ tools available</span>
                                        </div>

                                        {/* Messages */}
                                        <div className={cn("flex-1 p-5 space-y-4 overflow-hidden", isDark ? "bg-[#1A1A1A]" : "bg-white")}>
                                            {/* User message */}
                                            <div className="flex justify-end">
                                                <div className="chat-bubble-user font-sans-body text-sm max-w-[70%]">
                                                    Search for project presentations
                                                </div>
                                            </div>
                                            {/* Bot message */}
                                            <div className="flex gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-[#FF5500] flex items-center justify-center shrink-0">
                                                    <Brain className="w-4 h-4 text-white" aria-hidden="true" />
                                                </div>
                                                <div className="chat-bubble-ai font-sans-body text-sm max-w-[70%]">
                                                    <p>Found <strong>8 presentations</strong> matching your query:</p>
                                                    <div className="mt-3 space-y-2">
                                                        {['Q4 Strategy Deck.pptx', 'Product Launch Plan.pptx', 'Team Roadmap 2025.pptx'].map((file, i) => (
                                                            <div key={i} className={cn("flex items-center gap-2 text-xs", isDark ? "text-white/50" : "text-[#1A1A1A]/50")}>
                                                                <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                                                                {file}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            {/* User follow-up */}
                                            <div className="flex justify-end">
                                                <div className="chat-bubble-user font-sans-body text-sm max-w-[70%]">
                                                    Share Q4 Strategy Deck with the team
                                                </div>
                                            </div>
                                            {/* Bot confirmation */}
                                            <div className="flex gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-[#FF5500] flex items-center justify-center shrink-0">
                                                    <Brain className="w-4 h-4 text-white" aria-hidden="true" />
                                                </div>
                                                <div className="chat-bubble-ai font-sans-body text-sm max-w-[70%] flex items-center gap-2">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" aria-hidden="true" />
                                                    Shared! Team members now have view access.
                                                </div>
                                            </div>
                                        </div>

                                        {/* Input bar - Pulse Command Bar style */}
                                        <div className={cn(
                                            "border-t px-5 py-4 flex items-center gap-3",
                                            isDark ? "border-[#2A2A2A]" : "border-[#E5E5E5]"
                                        )}>
                                            <div className={cn(
                                                "flex-1 rounded-full px-5 py-3 text-sm font-sans-body flex items-center",
                                                isDark ? "bg-[#2A2A2A] text-white/40" : "bg-[#F5F5F5] text-[#1A1A1A]/40"
                                            )}>
                                                Type a message...
                                            </div>
                                            <div className="send-button">
                                                <Send className="w-5 h-5 text-white" aria-hidden="true" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </Section>

                {/* ====== 8.5. TESTIMONIALS - Editorial Tech ====== */}
                <Section className={cn("py-24 lg:py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden", isDark ? "bg-[#1A1A1A]" : "bg-white")} ariaLabel="Testimonials">
                    <div className="relative z-10 max-w-7xl mx-auto">
                        <div className="text-center mb-12">
                            <p className="text-sm font-semibold font-sans-body tracking-widest uppercase mb-4 text-[#FF5500]">
                                Testimonials
                            </p>
                            <h2 className={cn(
                                "text-4xl sm:text-5xl font-serif-display font-bold tracking-tight mb-4",
                                isDark ? "text-white" : "text-[#1A1A1A]"
                            )}>
                                Loved by Developers
                            </h2>
                            <p className={cn(
                                "text-lg font-sans-body max-w-2xl mx-auto",
                                isDark ? "text-white/60" : "text-[#1A1A1A]/60"
                            )}>
                                See what our users are saying about Neurix
                            </p>
                        </div>

                        {/* Testimonials Marquee */}
                        <div className="relative">
                            <div className={cn("pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r z-10", isDark ? "from-[#1A1A1A]" : "from-white")} />
                            <div className={cn("pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l z-10", isDark ? "from-[#1A1A1A]" : "from-white")} />

                            <Marquee pauseOnHover className="[--duration:30s]">
                                {[
                                    { name: "Alex Chen", username: "@alexchen", body: "Neurix has completely transformed how I interact with my tools. The MCP integration is seamless!", img: "https://avatar.vercel.sh/alexchen" },
                                    { name: "Sarah Miller", username: "@sarahm", body: "Finally, a unified interface for all my services. No more context switching between apps!", img: "https://avatar.vercel.sh/sarahm" },
                                    { name: "James Wilson", username: "@jwilson", body: "The AI chat interface makes complex operations feel natural. Absolutely love it.", img: "https://avatar.vercel.sh/jwilson" },
                                    { name: "Emily Davis", username: "@emilyd", body: "OAuth integration just works. Secure and simple. This is how software should be.", img: "https://avatar.vercel.sh/emilyd" },
                                ].map((review) => (
                                    <figure
                                        key={review.username}
                                        className={cn(
                                            "relative h-full w-72 cursor-pointer overflow-hidden rounded-[20px] p-5 mx-3 transition-all duration-300",
                                            isDark
                                                ? "bg-[#2A2A2A] hover:shadow-[0_10px_40px_rgba(255,85,0,0.1)]"
                                                : "bg-[#F5F5F5] hover:shadow-[0_10px_40px_rgba(0,0,0,0.08)]"
                                        )}
                                    >
                                        <div className="flex flex-row items-center gap-3">
                                            <img className="rounded-full" width="40" height="40" alt="" src={review.img} />
                                            <div className="flex flex-col">
                                                <figcaption className={cn("text-sm font-sans-medium", isDark ? "text-white" : "text-[#1A1A1A]")}>{review.name}</figcaption>
                                                <p className={cn("text-xs font-sans-body", isDark ? "text-white/40" : "text-[#1A1A1A]/40")}>{review.username}</p>
                                            </div>
                                        </div>
                                        <blockquote className={cn("mt-4 text-sm font-sans-body leading-relaxed", isDark ? "text-white/60" : "text-[#1A1A1A]/60")}>{review.body}</blockquote>
                                    </figure>
                                ))}
                            </Marquee>

                            <Marquee reverse pauseOnHover className="[--duration:30s] mt-5">
                                {[
                                    { name: "Michael Brown", username: "@mikeb", body: "Google Drive integration is flawless. I can search and manage files with natural language.", img: "https://avatar.vercel.sh/mikeb" },
                                    { name: "Lisa Wang", username: "@lisaw", body: "The real-time streaming responses make conversations feel so natural and responsive.", img: "https://avatar.vercel.sh/lisaw" },
                                    { name: "David Kim", username: "@davidk", body: "GitHub integration is a game-changer. Managing repos through chat is incredibly efficient.", img: "https://avatar.vercel.sh/davidk" },
                                    { name: "Rachel Green", username: "@rachelg", body: "Slack + Neurix = productivity heaven. Never going back to the old way of working.", img: "https://avatar.vercel.sh/rachelg" },
                                ].map((review) => (
                                    <figure
                                        key={review.username}
                                        className={cn(
                                            "relative h-full w-72 cursor-pointer overflow-hidden rounded-[20px] p-5 mx-3 transition-all duration-300",
                                            isDark
                                                ? "bg-[#2A2A2A] hover:shadow-[0_10px_40px_rgba(255,85,0,0.1)]"
                                                : "bg-[#F5F5F5] hover:shadow-[0_10px_40px_rgba(0,0,0,0.08)]"
                                        )}
                                    >
                                        <div className="flex flex-row items-center gap-3">
                                            <img className="rounded-full" width="40" height="40" alt="" src={review.img} />
                                            <div className="flex flex-col">
                                                <figcaption className={cn("text-sm font-sans-medium", isDark ? "text-white" : "text-[#1A1A1A]")}>{review.name}</figcaption>
                                                <p className={cn("text-xs font-sans-body", isDark ? "text-white/40" : "text-[#1A1A1A]/40")}>{review.username}</p>
                                            </div>
                                        </div>
                                        <blockquote className={cn("mt-4 text-sm font-sans-body leading-relaxed", isDark ? "text-white/60" : "text-[#1A1A1A]/60")}>{review.body}</blockquote>
                                    </figure>
                                ))}
                            </Marquee>
                        </div>
                    </div>
                </Section>

                {/* ====== 9. FINAL CTA - Editorial Tech Orange Background ====== */}
                <Section className="py-24 lg:py-32 px-4 sm:px-6 lg:px-8 bg-[#FF5500] relative overflow-hidden" ariaLabel="Call to Action">
                    {/* Decorative gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#FF5500] via-[#FF7A33] to-[#FF5500]" />
                    <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/10 to-transparent" />

                    <div className="relative z-10 max-w-3xl mx-auto text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5 }}
                        >
                            <h2 className="text-4xl sm:text-5xl md:text-6xl font-serif-display font-bold tracking-tight mb-6 text-white">
                                Ready to Transform
                                <br />
                                <span className="text-[#1A1A1A]">Your Workflow?</span>
                            </h2>
                            <p className="text-lg font-sans-body mb-10 max-w-xl mx-auto text-white/90">
                                Connect your favorite services and experience the power of MCP-driven conversations.
                                Free to use, no credit card required.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <motion.button
                                    onClick={onGetStarted}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="inline-flex items-center gap-3 px-8 py-4 rounded-full font-semibold font-sans-body transition-all bg-[#1A1A1A] text-white hover:bg-[#333333] shadow-xl"
                                >
                                    <span>Launch Neurix</span>
                                    <ArrowRight className="h-5 w-5" aria-hidden="true" />
                                </motion.button>
                                <motion.button
                                    onClick={() => window.open('https://github.com', '_blank')}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold font-sans-body transition-all bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
                                >
                                    <Github className="h-5 w-5" aria-hidden="true" />
                                    <span>View Source</span>
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>
                </Section>
            </main>

            {/* ====== 10. FOOTER - Editorial Tech ====== */}
            <footer className={cn("py-16 px-4 sm:px-6 lg:px-8", isDark ? "bg-[#0F0F0F]" : "bg-[#1A1A1A]")} role="contentinfo">
                <div className="max-w-7xl mx-auto">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
                        {/* Brand */}
                        <div className="sm:col-span-2 lg:col-span-1">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-10 h-10 rounded-xl bg-[#FF5500] flex items-center justify-center">
                                    <Brain className="w-5 h-5 text-white" aria-hidden="true" />
                                </div>
                                <span className="text-xl font-serif-display font-bold text-white">Neurix</span>
                            </div>
                            <p className="text-sm font-sans-body leading-relaxed max-w-xs text-white/50">
                                AI-powered MCP chat interface for seamless integration with all your tools and services.
                            </p>
                        </div>

                        {/* Product links */}
                        <div>
                            <h3 className="text-sm font-sans-medium mb-5 text-white">Product</h3>
                            <ul className="space-y-3">
                                {[
                                    { label: 'Features', id: 'features' },
                                    { label: 'How It Works', id: 'how-it-works' },
                                    { label: 'Integrations', id: 'integrations' },
                                    { label: 'Security', id: 'security' },
                                ].map((link) => (
                                    <li key={link.id}>
                                        <button
                                            onClick={() => scrollToSection(link.id)}
                                            className="text-sm font-sans-body text-white/50 hover:text-[#FF5500] transition-colors"
                                        >
                                            {link.label}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Resources */}
                        <div>
                            <h3 className="text-sm font-sans-medium mb-5 text-white">Resources</h3>
                            <ul className="space-y-3">
                                {[
                                    { label: 'MCP Protocol', href: '#' },
                                    { label: 'Integrations', href: '#' },
                                    { label: 'Documentation', href: '#' },
                                    { label: 'GitHub', href: '#' },
                                ].map((link) => (
                                    <li key={link.label}>
                                        <a
                                            href={link.href}
                                            className="text-sm font-sans-body text-white/50 hover:text-[#FF5500] transition-colors inline-block"
                                        >
                                            {link.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Tech stack */}
                        <div>
                            <h3 className="text-sm font-sans-medium mb-5 text-white">Built With</h3>
                            <div className="flex flex-wrap gap-2">
                                {['React 19', 'TypeScript', 'Express 5', 'Redis', 'MCP SDK', 'Vite'].map((tech) => (
                                    <span
                                        key={tech}
                                        className="text-xs font-sans-body px-3 py-1.5 rounded-full bg-white/5 text-white/50 hover:text-[#FF5500] hover:bg-[#FF5500]/10 transition-colors cursor-default"
                                    >
                                        {tech}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="editorial-divider my-10" />

                    {/* Copyright */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-sm font-sans-body text-white/40">
                            &copy; {new Date().getFullYear()} Neurix. MCP Chat Interface Platform.
                        </p>
                        <div className="flex items-center gap-6 text-sm font-sans-body text-white/40">
                            <div className="flex items-center gap-2 hover:text-[#FF5500] transition-colors cursor-pointer">
                                <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Enterprise Security</span>
                            </div>
                            <div className="flex items-center gap-2 hover:text-[#FF5500] transition-colors cursor-pointer">
                                <Globe className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Open Protocol</span>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Floating Dock Navigation - Editorial Tech */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                <Dock
                    direction="middle"
                    magnification={60}
                    distance={100}
                    className={cn(
                        "rounded-full backdrop-blur-md shadow-xl",
                        isDark ? "bg-[#1A1A1A]/95 shadow-[0_10px_40px_rgba(0,0,0,0.4)]" : "bg-white/95 shadow-[0_10px_40px_rgba(0,0,0,0.15)]"
                    )}
                >
                    <DockIcon>
                        <button
                            onClick={() => scrollToSection('features')}
                            className={cn(
                                "flex items-center justify-center w-full h-full rounded-full transition-all",
                                isDark ? "text-white/60 hover:text-[#FF5500] hover:bg-white/10" : "text-[#1A1A1A]/60 hover:text-[#FF5500] hover:bg-black/5"
                            )}
                            aria-label="Features"
                        >
                            <Layers className="w-5 h-5" />
                        </button>
                    </DockIcon>
                    <DockIcon>
                        <button
                            onClick={() => scrollToSection('integrations')}
                            className={cn(
                                "flex items-center justify-center w-full h-full rounded-full transition-all",
                                isDark ? "text-white/60 hover:text-[#FF5500] hover:bg-white/10" : "text-[#1A1A1A]/60 hover:text-[#FF5500] hover:bg-black/5"
                            )}
                            aria-label="Integrations"
                        >
                            <Plug className="w-5 h-5" />
                        </button>
                    </DockIcon>
                    <DockIcon>
                        <button
                            onClick={() => scrollToSection('how-it-works')}
                            className={cn(
                                "flex items-center justify-center w-full h-full rounded-full transition-all",
                                isDark ? "text-white/60 hover:text-[#FF5500] hover:bg-white/10" : "text-[#1A1A1A]/60 hover:text-[#FF5500] hover:bg-black/5"
                            )}
                            aria-label="Capabilities"
                        >
                            <Zap className="w-5 h-5" />
                        </button>
                    </DockIcon>
                    <DockIcon>
                        <button
                            onClick={() => scrollToSection('security')}
                            className={cn(
                                "flex items-center justify-center w-full h-full rounded-full transition-all",
                                isDark ? "text-white/60 hover:text-[#FF5500] hover:bg-white/10" : "text-[#1A1A1A]/60 hover:text-[#FF5500] hover:bg-black/5"
                            )}
                            aria-label="Security"
                        >
                            <Shield className="w-5 h-5" />
                        </button>
                    </DockIcon>
                    <DockIcon>
                        <button
                            onClick={onGetStarted}
                            className="flex items-center justify-center w-full h-full rounded-full bg-[#FF5500] text-white hover:bg-[#FF7A33] transition-colors"
                            aria-label="Get Started"
                        >
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </DockIcon>
                </Dock>
            </div>
        </div>
    );
}
