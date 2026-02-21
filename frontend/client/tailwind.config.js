/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
                heading: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
                display: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
                technical: ['JetBrains Mono', 'Fira Code', 'monospace']
            },
            colors: {
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))'
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))'
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))'
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))'
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))'
                },
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))'
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))'
                },
                sidebar: {
                    DEFAULT: 'hsl(var(--sidebar-background))',
                    foreground: 'hsl(var(--sidebar-foreground))',
                    primary: 'hsl(var(--sidebar-primary))',
                    'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
                    accent: 'hsl(var(--sidebar-accent))',
                    'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
                    border: 'hsl(var(--sidebar-border))',
                    ring: 'hsl(var(--sidebar-ring))',
                },
                // Neurix Visual Identity System
                obsidian: '#0F1115', // Primary Background
                midnight: '#050505', // Sidebar Background
                'electric-purple': '#8B5CF6', // AI Accent
                'mint-green': '#10B981', // Status Accent
                'slate-grey': '#8899A6', // Secondary Text
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)'
            },
            keyframes: {
                'accordion-down': {
                    from: { height: '0' },
                    to: { height: 'var(--radix-accordion-content-height)' },
                },
                'accordion-up': {
                    from: { height: 'var(--radix-accordion-content-height)' },
                    to: { height: '0' },
                },
                'fade-in': {
                    from: { opacity: '0', transform: 'translateY(10px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                'fade-out': {
                    from: { opacity: '1', transform: 'translateY(0)' },
                    to: { opacity: '0', transform: 'translateY(10px)' },
                },
                'slide-in-right': {
                    from: { transform: 'translateX(100%)' },
                    to: { transform: 'translateX(0)' },
                },
                'slide-out-right': {
                    from: { transform: 'translateX(0)' },
                    to: { transform: 'translateX(100%)' },
                },
                'scale-in': {
                    from: { opacity: '0', transform: 'scale(0.95)' },
                    to: { opacity: '1', transform: 'scale(1)' },
                },
                'spin-slow': {
                    from: { transform: 'rotate(0deg)' },
                    to: { transform: 'rotate(360deg)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
                pulse: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.5' },
                },
                bounce: {
                    '0%, 100%': { transform: 'translateY(-5%)', animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)' },
                    '50%': { transform: 'translateY(0)', animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)' },
                },
                'gradient-x': {
                    '0%, 100%': { 'background-position': '0% 50%' },
                    '50%': { 'background-position': '100% 50%' },
                },
                // Neural-themed animations
                'neural-jitter': {
                    '0%, 100%': { transform: 'translateX(0)' },
                    '25%': { transform: 'translateX(-1px)' },
                    '75%': { transform: 'translateX(1px)' },
                },
                'thinking-pulse': {
                    '0%, 100%': {
                        backgroundColor: '#6366f1',
                        boxShadow: '0 0 10px rgba(99, 102, 241, 0.5)'
                    },
                    '50%': {
                        backgroundColor: '#a855f7',
                        boxShadow: '0 0 20px rgba(168, 85, 247, 0.6)'
                    },
                },
                'neural-pulse': {
                    '0%, 100%': { opacity: '0.8', transform: 'scale(1)' },
                    '50%': { opacity: '1', transform: 'scale(1.02)' },
                },
                'glow-pulse': {
                    '0%, 100%': {
                        boxShadow: '0 0 5px rgba(99, 102, 241, 0.3)',
                        borderColor: 'rgba(99, 102, 241, 0.3)'
                    },
                    '50%': {
                        boxShadow: '0 0 20px rgba(99, 102, 241, 0.6)',
                        borderColor: 'rgba(99, 102, 241, 0.6)'
                    },
                },
                // Marquee animations
                'marquee': {
                    from: { transform: 'translateX(0)' },
                    to: { transform: 'translateX(calc(-100% - var(--gap)))' },
                },
                'marquee-vertical': {
                    from: { transform: 'translateY(0)' },
                    to: { transform: 'translateY(calc(-100% - var(--gap)))' },
                },
                // Border beam animation
                'border-beam': {
                    '100%': { 'offset-distance': '100%' },
                },
                // Meteor animation
                'meteor-effect': {
                    '0%': { transform: 'rotate(215deg) translateX(0)', opacity: '1' },
                    '70%': { opacity: '1' },
                    '100%': {
                        transform: 'rotate(215deg) translateX(-500px)',
                        opacity: '0',
                    },
                },
                // Pulsating button animation
                'pulsate': {
                    '0%': { transform: 'translate(-50%, -50%) scale(1)', opacity: '0.8' },
                    '50%': { transform: 'translate(-50%, -50%) scale(1.2)', opacity: '0' },
                    '100%': { transform: 'translate(-50%, -50%) scale(1)', opacity: '0' },
                },
                // Rainbow button animation
                'rainbow': {
                    '0%': { backgroundPosition: '0%' },
                    '100%': { backgroundPosition: '200%' },
                },
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
                'fade-in': 'fade-in 0.3s ease-out',
                'fade-out': 'fade-out 0.3s ease-out',
                'slide-in-right': 'slide-in-right 0.3s ease-out',
                'slide-out-right': 'slide-out-right 0.3s ease-out',
                'scale-in': 'scale-in 0.2s ease-out',
                'spin-slow': 'spin-slow 3s linear infinite',
                shimmer: 'shimmer 2s ease-in-out infinite',
                'pulse-slow': 'pulse 3s ease-in-out infinite',
                'bounce-slow': 'bounce 2s ease-in-out infinite',
                'gradient-x': 'gradient-x 3s ease infinite',
                // Neural animations
                'neural-jitter': 'neural-jitter 0.15s ease-in-out infinite',
                'thinking-pulse': 'thinking-pulse 2s ease-in-out infinite',
                'neural-pulse': 'neural-pulse 2s ease-in-out infinite',
                'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
                // Marquee animations
                'marquee': 'marquee var(--duration) linear infinite',
                'marquee-vertical': 'marquee-vertical var(--duration) linear infinite',
                // Border beam animation
                'border-beam': 'border-beam calc(var(--duration)*1s) infinite linear',
                // Meteor animation
                'meteor-effect': 'meteor-effect 5s linear infinite',
                // Pulsating button animation
                'pulsate': 'pulsate var(--duration) ease-out infinite',
                // Rainbow button animation
                'rainbow': 'rainbow var(--speed, 2s) infinite linear',
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
                'shimmer': 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
            },
            boxShadow: {
                'glow': '0 0 20px rgba(139, 92, 246, 0.3)',
                'glow-blue': '0 0 20px rgba(59, 130, 246, 0.3)',
                'glow-lg': '0 0 40px rgba(139, 92, 246, 0.4)',
                'inner-glow': 'inset 0 0 20px rgba(139, 92, 246, 0.2)',
                // Neural glow effects
                'glow-neural': '0 0 20px rgba(99, 102, 241, 0.4)',
                'glow-neural-lg': '0 0 40px rgba(99, 102, 241, 0.5)',
                'glow-reasoning': '0 0 20px rgba(168, 85, 247, 0.4)',
                'glow-reasoning-lg': '0 0 40px rgba(168, 85, 247, 0.5)',
                'glow-integrity': '0 0 20px rgba(16, 185, 129, 0.4)',
                'glow-integrity-lg': '0 0 40px rgba(16, 185, 129, 0.5)',
            },
        }
    },
    plugins: [require("tailwindcss-animate")],
}
