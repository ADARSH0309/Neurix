import {
    HardDrive,
    FormInput,
    Github,
    MessageSquare,
    FileText,
    Mail,
    Calendar,
    Sparkles,
} from 'lucide-react';

export interface ServerVisual {
    icon: React.ElementType;
    gradient: string;
    accent: string;
    lightBg: string;
    darkBg: string;
}

const serverVisuals: Record<string, ServerVisual> = {
    gdrive: {
        icon: HardDrive,
        gradient: 'from-blue-500 to-blue-600',
        accent: 'blue',
        lightBg: 'bg-blue-50',
        darkBg: 'bg-blue-500/10',
    },
    gforms: {
        icon: FormInput,
        gradient: 'from-purple-500 to-purple-600',
        accent: 'purple',
        lightBg: 'bg-purple-50',
        darkBg: 'bg-purple-500/10',
    },
    github: {
        icon: Github,
        gradient: 'from-gray-700 to-gray-900',
        accent: 'gray',
        lightBg: 'bg-gray-50',
        darkBg: 'bg-gray-500/10',
    },
    slack: {
        icon: MessageSquare,
        gradient: 'from-green-500 to-emerald-600',
        accent: 'green',
        lightBg: 'bg-green-50',
        darkBg: 'bg-green-500/10',
    },
    notion: {
        icon: FileText,
        gradient: 'from-gray-800 to-black dark:from-gray-600 dark:to-gray-800',
        accent: 'gray',
        lightBg: 'bg-gray-50',
        darkBg: 'bg-gray-500/10',
    },
    gmail: {
        icon: Mail,
        gradient: 'from-red-500 to-red-600',
        accent: 'red',
        lightBg: 'bg-red-50',
        darkBg: 'bg-red-500/10',
    },
    gcalendar: {
        icon: Calendar,
        gradient: 'from-teal-500 to-cyan-600',
        accent: 'teal',
        lightBg: 'bg-teal-50',
        darkBg: 'bg-teal-500/10',
    },
};

const fallbackVisual: ServerVisual = {
    icon: Sparkles,
    gradient: 'from-gray-500 to-gray-600',
    accent: 'gray',
    lightBg: 'bg-gray-50',
    darkBg: 'bg-gray-500/10',
};

export function getServerVisual(id: string): ServerVisual {
    return serverVisuals[id] || fallbackVisual;
}

export function getServerIcon(id: string): React.ElementType {
    return getServerVisual(id).icon;
}

export function getServerColor(id: string): string {
    return getServerVisual(id).gradient;
}
