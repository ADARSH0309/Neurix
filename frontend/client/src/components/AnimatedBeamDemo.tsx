"use client";

import React, { forwardRef, useRef } from "react";
import { cn } from "@/lib/utils";
import { AnimatedBeam } from "@/components/ui/animated-beam";
import { Brain } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Integration Circle component for AnimatedBeam
const IntegrationCircle = forwardRef<
    HTMLDivElement,
    { className?: string; children?: React.ReactNode; isDark?: boolean }
>(({ className, children, isDark }, ref) => {
    return (
        <div
            ref={ref}
            className={cn(
                "z-10 flex size-12 items-center justify-center rounded-full border-2 p-3 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]",
                isDark ? "bg-card border-border" : "bg-white border-gray-200",
                className
            )}
        >
            {children}
        </div>
    );
});
IntegrationCircle.displayName = "IntegrationCircle";

// Integration Icons
const IntegrationIcons = {
    notion: () => (
        <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <path d="M6.017 4.313l55.333 -4.087c6.797 -0.583 8.543 -0.19 12.817 2.917l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277 -1.553 6.807 -6.99 7.193L24.467 99.967c-4.08 0.193 -6.023 -0.39 -8.16 -3.113L3.3 79.94c-2.333 -3.113 -3.3 -5.443 -3.3 -8.167V11.113c0 -3.497 1.553 -6.413 6.017 -6.8z" fill="#ffffff" />
            <path d="M61.35 0.227l-55.333 4.087C1.553 4.7 0 7.617 0 11.113v60.66c0 2.723 0.967 5.053 3.3 8.167l13.007 16.913c2.137 2.723 4.08 3.307 8.16 3.113l64.257 -3.89c5.433 -0.387 6.99 -2.917 6.99 -7.193V20.64c0 -2.21 -0.873 -2.847 -3.443 -4.733L74.167 3.143c-4.273 -3.107 -6.02 -3.5 -12.817 -2.917zM25.92 19.523c-5.247 0.353 -6.437 0.433 -9.417 -1.99L8.927 11.507c-0.77 -0.78 -0.383 -1.753 1.557 -1.947l53.193 -3.887c4.467 -0.39 6.793 1.167 8.54 2.527l9.123 6.61c0.39 0.197 1.36 1.36 0.193 1.36l-54.933 3.307 -0.68 0.047zM19.803 88.3V30.367c0 -2.53 0.777 -3.697 3.103 -3.893L86 22.78c2.14 -0.193 3.107 1.167 3.107 3.693v57.547c0 2.53 -0.39 4.67 -3.883 4.863l-60.377 3.5c-3.493 0.193 -5.043 -0.97 -5.043 -4.083zm59.6 -54.827c0.387 1.75 0 3.5 -1.75 3.7l-2.91 0.577v42.773c-2.527 1.36 -4.853 2.137 -6.797 2.137 -3.107 0 -3.883 -0.973 -6.21 -3.887l-19.03 -29.94v28.967l6.02 1.363s0 3.5 -4.857 3.5l-13.39 0.777c-0.39 -0.78 0 -2.723 1.357 -3.11l3.497 -0.97v-38.3L30.48 40.667c-0.39 -1.75 0.58 -4.277 3.3 -4.473l14.367 -0.967 19.8 30.327v-26.83l-5.047 -0.58c-0.39 -2.143 1.163 -3.7 3.103 -3.89l13.4 -0.78z" fill="#000000" fillRule="evenodd" clipRule="evenodd" />
        </svg>
    ),
    neurix: ({ isDark }: { isDark: boolean }) => (
        <Brain className={cn("w-full h-full", isDark ? "text-neural-energy" : "text-orange-500")} />
    ),
    googleDrive: () => (
        <svg width="100" height="100" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
            <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47" />
            <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335" />
            <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
            <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
            <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
        </svg>
    ),
    whatsapp: () => (
        <svg width="100" height="100" viewBox="0 0 175.216 175.552" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <defs>
                <linearGradient id="whatsapp-gradient" x1="85.915" x2="86.535" y1="32.567" y2="137.092" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#57d163" />
                    <stop offset="1" stopColor="#23b33a" />
                </linearGradient>
            </defs>
            <path d="m54.532 138.45 2.235 1.324c9.387 5.571 20.15 8.518 31.126 8.523h.023c33.707 0 61.139-27.426 61.153-61.135.006-16.335-6.349-31.696-17.895-43.251A60.75 60.75 0 0 0 87.94 25.983c-33.733 0-61.166 27.423-61.178 61.13a60.98 60.98 0 0 0 9.349 32.535l1.455 2.312-6.179 22.558zm-40.811 23.544L24.16 123.88c-6.438-11.154-9.825-23.808-9.821-36.772.017-40.556 33.021-73.55 73.578-73.55 19.681.01 38.154 7.669 52.047 21.572s21.537 32.383 21.53 52.037c-.018 40.553-33.027 73.553-73.578 73.553h-.032c-12.313-.005-24.412-3.094-35.159-8.954zm0 0" fill="#b3b3b3" filter="url(#a)" />
            <path d="m12.966 161.238 10.439-38.114a73.42 73.42 0 0 1-9.821-36.772c.017-40.556 33.021-73.55 73.578-73.55 19.681.01 38.154 7.669 52.047 21.572s21.537 32.383 21.53 52.037c-.018 40.553-33.027 73.553-73.578 73.553h-.032c-12.313-.005-24.412-3.094-35.159-8.954z" fill="#ffffff" />
            <path d="M87.184 25.227c-33.733 0-61.166 27.423-61.178 61.13a60.98 60.98 0 0 0 9.349 32.535l1.455 2.312-6.179 22.559 23.146-6.069 2.235 1.324c9.387 5.571 20.15 8.518 31.126 8.524h.023c33.707 0 61.14-27.426 61.153-61.135a60.75 60.75 0 0 0-17.895-43.251 60.75 60.75 0 0 0-43.235-17.929z" fill="url(#whatsapp-gradient)" />
            <path d="M68.772 55.603c-1.378-3.061-2.828-3.123-4.137-3.176l-3.524-.043c-1.226 0-3.218.46-4.902 2.3s-6.435 6.287-6.435 15.332 6.588 17.785 7.506 19.013 12.718 20.381 31.405 27.75c15.529 6.124 18.689 4.906 22.061 4.6s10.877-4.447 12.408-8.74 1.532-7.971 1.073-8.74-1.685-1.226-3.525-2.146-10.877-5.367-12.562-5.981-2.91-.919-4.137.921-4.746 5.979-5.819 7.206-2.144 1.381-3.984.462-7.76-2.861-14.784-9.124c-5.465-4.873-9.154-10.891-10.228-12.73s-.114-2.835.808-3.751c.825-.824 1.838-2.147 2.759-3.22s1.224-1.84 1.836-3.065.307-2.301-.153-3.22-4.032-10.011-5.666-13.647" fill="#ffffff" fillRule="evenodd" />
        </svg>
    ),
    googleDocs: () => (
        <svg width="47" height="65" viewBox="0 0 47 65" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <path d="M29.375,0 L4.40625,0 C1.9828125,0 0,1.99431818 0,4.43181818 L0,60.5681818 C0,63.0056818 1.9828125,65 4.40625,65 L42.59375,65 C45.0171875,65 47,63.0056818 47,60.5681818 L47,17.7272727 L36.71875,10.3409091 L29.375,0 Z" fill="#4285F4" />
            <path d="M11.75,47.2727273 L35.25,47.2727273 L35.25,44.3181818 L11.75,44.3181818 L11.75,47.2727273 Z M11.75,53.1818182 L29.375,53.1818182 L29.375,50.2272727 L11.75,50.2272727 L11.75,53.1818182 Z M11.75,32.5 L11.75,35.4545455 L35.25,35.4545455 L35.25,32.5 L11.75,32.5 Z M11.75,41.3636364 L35.25,41.3636364 L35.25,38.4090909 L11.75,38.4090909 L11.75,41.3636364 Z" fill="#F1F1F1" />
            <path d="M29.375,0 L29.375,13.2954545 C29.375,15.7440341 31.3467969,17.7272727 33.78125,17.7272727 L47,17.7272727 L29.375,0 Z" fill="#A1C2FA" />
        </svg>
    ),
    slack: () => (
        <svg width="100" height="100" viewBox="0 0 127 127" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <path d="M27.2 80c0 7.3-5.9 13.2-13.2 13.2C6.7 93.2.8 87.3.8 80c0-7.3 5.9-13.2 13.2-13.2h13.2V80zm6.6 0c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2v33c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V80z" fill="#E01E5A" />
            <path d="M47 27c-7.3 0-13.2-5.9-13.2-13.2C33.8 6.5 39.7.6 47 .6c7.3 0 13.2 5.9 13.2 13.2V27H47zm0 6.7c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H13.9C6.6 60.1.7 54.2.7 46.9c0-7.3 5.9-13.2 13.2-13.2H47z" fill="#36C5F0" />
            <path d="M99.9 46.9c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H99.9V46.9zm-6.6 0c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V13.8C66.9 6.5 72.8.6 80.1.6c7.3 0 13.2 5.9 13.2 13.2v33.1z" fill="#2EB67D" />
            <path d="M80.1 99.8c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V99.8h13.2zm0-6.6c-7.3 0-13.2-5.9-13.2-13.2 0-7.3 5.9-13.2 13.2-13.2h33.1c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H80.1z" fill="#ECB22E" />
        </svg>
    ),
    github: ({ isDark }: { isDark: boolean }) => (
        <svg width="100" height="100" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" fill={isDark ? "#ffffff" : "#24292f"} />
        </svg>
    ),
    messenger: () => (
        <svg width="100" height="100" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <defs>
                <radialGradient id="messenger-gradient" cx="11.087" cy="7.022" r="47.612" gradientTransform="matrix(1 0 0 -1 0 50)" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#1292ff" />
                    <stop offset=".079" stopColor="#2982ff" />
                    <stop offset=".23" stopColor="#4e69ff" />
                    <stop offset=".351" stopColor="#6559ff" />
                    <stop offset=".428" stopColor="#6d53ff" />
                    <stop offset=".754" stopColor="#df47aa" />
                    <stop offset=".946" stopColor="#ff6257" />
                </radialGradient>
            </defs>
            <path fill="url(#messenger-gradient)" d="M44,23.5C44,34.27,35.05,43,24,43c-1.651,0-3.25-0.194-4.784-0.564c-0.465-0.112-0.951-0.069-1.379,0.145L13.46,44.77C12.33,45.335,11,44.513,11,43.249v-4.025c0-0.575-0.257-1.111-0.681-1.499C6.425,34.165,4,29.11,4,23.5C4,12.73,12.95,4,24,4S44,12.73,44,23.5z" />
            <path fill="#ffffff" d="M34.394,18.501l-5.7,4.22c-0.61,0.46-1.44,0.46-2.04,0.01L22.68,19.74c-1.68-1.25-4.06-0.82-5.19,0.94l-1.21,1.89l-4.11,6.68c-0.6,0.94,0.55,2.01,1.44,1.34l5.7-4.22c0.61-0.46,1.44-0.46,2.04-0.01l3.974,2.991c1.68,1.25,4.06,0.82,5.19-0.94l1.21-1.89l4.11-6.68C36.434,18.901,35.284,17.831,34.394,18.501z" />
        </svg>
    ),
};

// Animated Beam Integration Graph
export function AnimatedBeamDemo({ isDark }: { isDark: boolean }): React.ReactElement {
    const containerRef = useRef<HTMLDivElement>(null);
    const div1Ref = useRef<HTMLDivElement>(null);
    const div2Ref = useRef<HTMLDivElement>(null);
    const div3Ref = useRef<HTMLDivElement>(null);
    const div4Ref = useRef<HTMLDivElement>(null);
    const div5Ref = useRef<HTMLDivElement>(null);
    const div6Ref = useRef<HTMLDivElement>(null);
    const div7Ref = useRef<HTMLDivElement>(null);

    const gradientStart = isDark ? "#6366f1" : "#f97316";
    const gradientEnd = isDark ? "#a855f7" : "#ec4899";
    const pathColor = isDark ? "rgba(99, 102, 241, 0.2)" : "rgba(249, 115, 22, 0.2)";

    const integrationDetails = {
        googleDrive: { name: "Google Drive", description: "Access, search, and manage your files directly through chat." },
        googleDocs: { name: "Google Docs", description: "Create, edit, and collaborate on documents seamlessly." },
        notion: { name: "Notion", description: "Query and update your Notion workspace with natural language." },
        slack: { name: "Slack", description: "Send messages and manage channels without leaving the chat." },
        whatsapp: { name: "WhatsApp", description: "Integrate your WhatsApp communications effortlessly." },
        messenger: { name: "Messenger", description: "Connect with Messenger for unified communications." },
    };

    return (
        <div
            className="relative flex h-[400px] w-full max-w-xl mx-auto items-center justify-center overflow-hidden p-10"
            ref={containerRef}
        >
            <div className="flex size-full max-h-[300px] max-w-lg flex-col items-stretch justify-between gap-10">
                <div className="flex flex-row items-center justify-between">
                    <Popover>
                        <PopoverTrigger asChild>
                            <IntegrationCircle ref={div1Ref} isDark={isDark} className="cursor-pointer hover:scale-110 transition-transform">
                                <IntegrationIcons.googleDrive />
                            </IntegrationCircle>
                        </PopoverTrigger>
                        <PopoverContent className={cn("w-64", isDark ? "bg-card border-border" : "bg-white border-gray-200")}>
                            <div className="space-y-2">
                                <h4 className="font-semibold">{integrationDetails.googleDrive.name}</h4>
                                <p className="text-sm text-muted-foreground">{integrationDetails.googleDrive.description}</p>
                            </div>
                        </PopoverContent>
                    </Popover>
                    <Popover>
                        <PopoverTrigger asChild>
                            <IntegrationCircle ref={div5Ref} isDark={isDark} className="cursor-pointer hover:scale-110 transition-transform">
                                <IntegrationIcons.googleDocs />
                            </IntegrationCircle>
                        </PopoverTrigger>
                        <PopoverContent className={cn("w-64", isDark ? "bg-card border-border" : "bg-white border-gray-200")}>
                            <div className="space-y-2">
                                <h4 className="font-semibold">{integrationDetails.googleDocs.name}</h4>
                                <p className="text-sm text-muted-foreground">{integrationDetails.googleDocs.description}</p>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="flex flex-row items-center justify-between">
                    <Popover>
                        <PopoverTrigger asChild>
                            <IntegrationCircle ref={div2Ref} isDark={isDark} className="cursor-pointer hover:scale-110 transition-transform">
                                <IntegrationIcons.notion />
                            </IntegrationCircle>
                        </PopoverTrigger>
                        <PopoverContent className={cn("w-64", isDark ? "bg-card border-border" : "bg-white border-gray-200")}>
                            <div className="space-y-2">
                                <h4 className="font-semibold">{integrationDetails.notion.name}</h4>
                                <p className="text-sm text-muted-foreground">{integrationDetails.notion.description}</p>
                            </div>
                        </PopoverContent>
                    </Popover>
                    <IntegrationCircle ref={div4Ref} isDark={isDark} className="size-16">
                        <IntegrationIcons.neurix isDark={isDark} />
                    </IntegrationCircle>
                    <Popover>
                        <PopoverTrigger asChild>
                            <IntegrationCircle ref={div6Ref} isDark={isDark} className="cursor-pointer hover:scale-110 transition-transform">
                                <IntegrationIcons.slack />
                            </IntegrationCircle>
                        </PopoverTrigger>
                        <PopoverContent className={cn("w-64", isDark ? "bg-card border-border" : "bg-white border-gray-200")}>
                            <div className="space-y-2">
                                <h4 className="font-semibold">{integrationDetails.slack.name}</h4>
                                <p className="text-sm text-muted-foreground">{integrationDetails.slack.description}</p>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="flex flex-row items-center justify-between">
                    <Popover>
                        <PopoverTrigger asChild>
                            <IntegrationCircle ref={div3Ref} isDark={isDark} className="cursor-pointer hover:scale-110 transition-transform">
                                <IntegrationIcons.whatsapp />
                            </IntegrationCircle>
                        </PopoverTrigger>
                        <PopoverContent className={cn("w-64", isDark ? "bg-card border-border" : "bg-white border-gray-200")}>
                            <div className="space-y-2">
                                <h4 className="font-semibold">{integrationDetails.whatsapp.name}</h4>
                                <p className="text-sm text-muted-foreground">{integrationDetails.whatsapp.description}</p>
                            </div>
                        </PopoverContent>
                    </Popover>
                    <Popover>
                        <PopoverTrigger asChild>
                            <IntegrationCircle ref={div7Ref} isDark={isDark} className="cursor-pointer hover:scale-110 transition-transform">
                                <IntegrationIcons.messenger />
                            </IntegrationCircle>
                        </PopoverTrigger>
                        <PopoverContent className={cn("w-64", isDark ? "bg-card border-border" : "bg-white border-gray-200")}>
                            <div className="space-y-2">
                                <h4 className="font-semibold">{integrationDetails.messenger.name}</h4>
                                <p className="text-sm text-muted-foreground">{integrationDetails.messenger.description}</p>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            <AnimatedBeam
                containerRef={containerRef}
                fromRef={div1Ref}
                toRef={div4Ref}
                curvature={-75}
                endYOffset={-10}
                gradientStartColor={gradientStart}
                gradientStopColor={gradientEnd}
                pathColor={pathColor}
            />
            <AnimatedBeam
                containerRef={containerRef}
                fromRef={div2Ref}
                toRef={div4Ref}
                gradientStartColor={gradientStart}
                gradientStopColor={gradientEnd}
                pathColor={pathColor}
            />
            <AnimatedBeam
                containerRef={containerRef}
                fromRef={div3Ref}
                toRef={div4Ref}
                curvature={75}
                endYOffset={10}
                gradientStartColor={gradientStart}
                gradientStopColor={gradientEnd}
                pathColor={pathColor}
            />
            <AnimatedBeam
                containerRef={containerRef}
                fromRef={div5Ref}
                toRef={div4Ref}
                curvature={-75}
                endYOffset={-10}
                reverse
                gradientStartColor={gradientStart}
                gradientStopColor={gradientEnd}
                pathColor={pathColor}
            />
            <AnimatedBeam
                containerRef={containerRef}
                fromRef={div6Ref}
                toRef={div4Ref}
                reverse
                gradientStartColor={gradientStart}
                gradientStopColor={gradientEnd}
                pathColor={pathColor}
            />
            <AnimatedBeam
                containerRef={containerRef}
                fromRef={div7Ref}
                toRef={div4Ref}
                curvature={75}
                endYOffset={10}
                reverse
                gradientStartColor={gradientStart}
                gradientStopColor={gradientEnd}
                pathColor={pathColor}
            />
        </div>
    );
}
