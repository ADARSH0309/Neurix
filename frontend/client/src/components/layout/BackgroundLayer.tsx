import { memo } from 'react';

export const BackgroundLayer = memo(function BackgroundLayer() {
    return (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            {/* Base */}
            <div className="absolute inset-0 bg-background" />

            {/* Subtle Grid */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] dark:opacity-[0.03] bg-center [mask-image:linear-gradient(to_bottom,transparent,black,transparent)]" />

            {/* Ambient Orbs - subtle in light, more visible in dark */}
            <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-orange-100/30 dark:bg-purple-900/10 blur-[120px] animate-pulse-slow" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[30vw] h-[30vw] rounded-full bg-blue-100/20 dark:bg-blue-900/10 blur-[100px] animate-pulse-slow delay-1000" />

            {/* Noise Texture */}
            <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.02] mix-blend-overlay"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23noise)'/%3E%3C/svg%3E")` }}
            />
        </div>
    );
});
