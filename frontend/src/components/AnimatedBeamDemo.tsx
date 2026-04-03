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
    googleForms: () => (
        <svg width="100" height="100" viewBox="0 0 48 66" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <path d="M29.5 0H4.5C2 0 0 2 0 4.5V61.5C0 64 2 66 4.5 66H43.5C46 66 48 64 48 61.5V18.5L29.5 0Z" fill="#673AB7" />
            <path d="M29.5 0V14C29.5 16.5 31.5 18.5 34 18.5H48L29.5 0Z" fill="#B39DDB" />
            <circle cx="15" cy="33" r="2.5" fill="#F1F1F1" />
            <rect x="22" y="31" width="15" height="4" rx="1" fill="#F1F1F1" />
            <circle cx="15" cy="43" r="2.5" fill="#F1F1F1" />
            <rect x="22" y="41" width="15" height="4" rx="1" fill="#F1F1F1" />
            <circle cx="15" cy="53" r="2.5" fill="#F1F1F1" />
            <rect x="22" y="51" width="15" height="4" rx="1" fill="#F1F1F1" />
        </svg>
    ),
    gmail: () => (
        <svg width="100" height="100" viewBox="0 0 75 75" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <path d="M8.5 62.5H19V37.5L3 25.5V57C3 60 5.5 62.5 8.5 62.5Z" fill="#4285F4" />
            <path d="M56 62.5H66.5C69.5 62.5 72 60 72 57V25.5L56 37.5Z" fill="#34A853" />
            <path d="M56 17.5V37.5L72 25.5V20C72 13 64 9 58.5 13.5Z" fill="#FBBC04" />
            <path d="M19 37.5V17.5L37.5 32L56 17.5V37.5L37.5 52Z" fill="#EA4335" />
            <path d="M3 20V25.5L19 37.5V17.5L16.5 13.5C11 9 3 13 3 20Z" fill="#C5221F" />
        </svg>
    ),
    gcalendar: () => (
        <svg width="100" height="100" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <path d="M148.882 43.619H51.118L43.619 51.118V148.882L51.118 156.381H148.882L156.381 148.882V51.118L148.882 43.619Z" fill="#FFFFFF" />
            <path d="M116.246 128.857C111.738 131.816 105.867 133.294 98.634 133.294C91.641 133.294 85.89 131.518 81.382 127.97C76.874 124.418 74.264 119.654 73.547 113.678H85.412C85.89 117.108 87.366 119.77 89.846 121.668C92.326 123.566 95.458 124.518 99.248 124.518C103.158 124.518 106.294 123.446 108.654 121.308C111.014 119.17 112.192 116.374 112.192 112.922C112.192 109.47 110.954 106.674 108.474 104.536C105.994 102.398 102.918 101.326 99.248 101.326H93.252V92.91H98.634C101.83 92.91 104.548 91.958 106.788 90.06C109.028 88.162 110.148 85.666 110.148 82.574C110.148 79.842 109.148 77.586 107.148 75.808C105.148 74.03 102.438 73.138 99.008 73.138C95.698 73.138 93.058 74.03 91.098 75.808C89.138 77.586 87.838 79.842 87.198 82.574H75.812C76.572 76.598 79.122 71.834 83.472 68.282C87.822 64.73 93.132 62.952 99.368 62.952C106.362 62.952 111.978 64.67 116.246 68.102C120.514 71.534 122.648 76.118 122.648 81.854C122.648 85.786 121.508 89.178 119.228 92.03C116.948 94.882 114.108 96.78 110.698 97.738V98.098C114.828 98.934 118.218 100.892 120.858 103.984C123.498 107.076 124.818 110.768 124.818 115.062C124.818 121.156 122.628 126.04 118.24 129.712" fill="#1A73E8" />
            <path d="M51.118 156.381H148.882L156.381 148.882V51.118L148.882 43.619H51.118L43.619 51.118V148.882L51.118 156.381Z" fill="none" stroke="#1A73E8" strokeWidth="0" />
            <path d="M148.882 195.238L195.238 148.882H156.381V148.882L148.882 156.381V195.238Z" fill="#1B72E8" />
            <path d="M4.762 148.882L51.118 195.238V156.381L43.619 148.882H4.762Z" fill="#EA4335" />
            <path d="M148.882 43.619L156.381 51.118H195.238L148.882 4.762V43.619Z" fill="#34A853" />
            <path d="M156.381 51.118V148.882H195.238V51.118H156.381Z" fill="#4285F4" />
            <path d="M4.762 51.118V148.882H43.619V51.118H4.762Z" fill="#FBBC04" />
            <path d="M43.619 51.118H156.381V4.762H43.619V51.118Z" fill="#188038" />
            <path d="M4.762 51.118L51.118 4.762V43.619L43.619 51.118H4.762Z" fill="#1967D2" />
        </svg>
    ),
    gtask: () => (
        <svg width="100" height="100" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <path d="M36.5 14.5L22 29L16.5 23.5L13 27L22 36L40 18L36.5 14.5Z" fill="#1967D2" />
            <path d="M7 42C7 44.2 8.8 46 11 46H37C39.2 46 41 44.2 41 42V22H7V42Z" fill="#4285F4" />
            <path d="M37 8H33V4C33 2.8 32.2 2 31 2C29.8 2 29 2.8 29 4V8H19V4C19 2.8 18.2 2 17 2C15.8 2 15 2.8 15 4V8H11C8.8 8 7 9.8 7 12V18H41V12C41 9.8 39.2 8 37 8Z" fill="#1A73E8" />
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
        googleForms: { name: "Google Forms", description: "Create, edit, and manage forms & surveys seamlessly." },
        gmail: { name: "Gmail", description: "Read, search, and send emails through natural conversation." },
        gcalendar: { name: "Google Calendar", description: "Manage events, meetings, and schedules effortlessly." },
        gtask: { name: "Google Tasks", description: "Create and manage task lists and to-dos with ease." },
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
                                <IntegrationIcons.googleForms />
                            </IntegrationCircle>
                        </PopoverTrigger>
                        <PopoverContent className={cn("w-64", isDark ? "bg-card border-border" : "bg-white border-gray-200")}>
                            <div className="space-y-2">
                                <h4 className="font-semibold">{integrationDetails.googleForms.name}</h4>
                                <p className="text-sm text-muted-foreground">{integrationDetails.googleForms.description}</p>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="flex flex-row items-center justify-between">
                    <Popover>
                        <PopoverTrigger asChild>
                            <IntegrationCircle ref={div2Ref} isDark={isDark} className="cursor-pointer hover:scale-110 transition-transform">
                                <IntegrationIcons.gmail />
                            </IntegrationCircle>
                        </PopoverTrigger>
                        <PopoverContent className={cn("w-64", isDark ? "bg-card border-border" : "bg-white border-gray-200")}>
                            <div className="space-y-2">
                                <h4 className="font-semibold">{integrationDetails.gmail.name}</h4>
                                <p className="text-sm text-muted-foreground">{integrationDetails.gmail.description}</p>
                            </div>
                        </PopoverContent>
                    </Popover>
                    <IntegrationCircle ref={div4Ref} isDark={isDark} className="size-16">
                        <IntegrationIcons.neurix isDark={isDark} />
                    </IntegrationCircle>
                    <Popover>
                        <PopoverTrigger asChild>
                            <IntegrationCircle ref={div6Ref} isDark={isDark} className="cursor-pointer hover:scale-110 transition-transform">
                                <IntegrationIcons.gcalendar />
                            </IntegrationCircle>
                        </PopoverTrigger>
                        <PopoverContent className={cn("w-64", isDark ? "bg-card border-border" : "bg-white border-gray-200")}>
                            <div className="space-y-2">
                                <h4 className="font-semibold">{integrationDetails.gcalendar.name}</h4>
                                <p className="text-sm text-muted-foreground">{integrationDetails.gcalendar.description}</p>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="flex flex-row items-center justify-center">
                    <Popover>
                        <PopoverTrigger asChild>
                            <IntegrationCircle ref={div3Ref} isDark={isDark} className="cursor-pointer hover:scale-110 transition-transform">
                                <IntegrationIcons.gtask />
                            </IntegrationCircle>
                        </PopoverTrigger>
                        <PopoverContent className={cn("w-64", isDark ? "bg-card border-border" : "bg-white border-gray-200")}>
                            <div className="space-y-2">
                                <h4 className="font-semibold">{integrationDetails.gtask.name}</h4>
                                <p className="text-sm text-muted-foreground">{integrationDetails.gtask.description}</p>
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
        </div>
    );
}
