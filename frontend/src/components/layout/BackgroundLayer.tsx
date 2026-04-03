import { memo } from 'react';

export const BackgroundLayer = memo(function BackgroundLayer() {
    return (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-background transition-colors duration-500">
            {/* Light Mode - Clean white with subtle gradient */}
            <div className="absolute inset-x-0 top-0 h-[600px] bg-gradient-to-b from-slate-50/80 to-transparent dark:hidden" />

            {/* Dark Mode Ambient Elements */}
            <div className="hidden dark:block">
                {/* Base Neural Gradient Map */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(168,85,247,0.08),transparent_50%),radial-gradient(circle_at_0%_0%,rgba(52,211,153,0.05),transparent_40%)]" />

                {/* Premium HUD Grid from main.css */}
                <div className="absolute inset-0 hud-grid opacity-30 [mask-image:radial-gradient(ellipse_100%_100%_at_50%_50%,black_10%,transparent_100%)]" />

                {/* Large Ambient Floating Orbs */}
                <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-electric-purple/5 blur-[150px] animate-float-slow mix-blend-screen" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-mint-green/5 blur-[120px] animate-float delay-1000 mix-blend-screen" />
                <div className="absolute top-[40%] left-[80%] w-[30vw] h-[30vw] rounded-full bg-electric-purple/5 blur-[100px] animate-float-reverse delay-500 mix-blend-screen" />

                {/* Scanlines Overlay for Terminal Vibe */}
                <div className="absolute inset-0 scanlines-subtle opacity-40 mix-blend-overlay" />

                {/* Premium Noise Texture */}
                <div className="absolute inset-0 opacity-[0.025] mix-blend-overlay"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23noise)'/%3E%3C/svg%3E")` }}
                />
            </div>
        </div>
    );
});
