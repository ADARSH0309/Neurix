import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sun, Moon, Monitor, Bell, Volume2, Rows3, Trash2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserSettings } from '@/types';

interface SettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    settings: UserSettings;
    onSave: (settings: UserSettings) => void;
    onClearData: () => void;
}

function Toggle({ enabled, onToggle, label }: { enabled: boolean; onToggle: () => void; label: string }): React.ReactElement {
    return (
        <button
            onClick={onToggle}
            role="switch"
            aria-checked={enabled}
            aria-label={label}
            className={cn(
                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neurix-orange/50",
                enabled ? "bg-neurix-orange" : "bg-white/10"
            )}
        >
            <span
                className={cn(
                    "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm",
                    enabled ? "translate-x-4.5" : "translate-x-1"
                )}
            />
        </button>
    );
}

export function SettingsDialog({ open, onOpenChange, settings, onSave, onClearData }: SettingsDialogProps): React.ReactElement {
    const handleThemeChange = (theme: UserSettings['theme']): void => {
        onSave({ ...settings, theme });
    };

    const themeOptions = [
        { value: 'light' as const, icon: Sun, label: 'Light' },
        { value: 'dark' as const, icon: Moon, label: 'Dark' },
        { value: 'system' as const, icon: Monitor, label: 'System' },
    ];

    const toggleOptions = [
        {
            key: 'notifications' as const,
            icon: Bell,
            label: 'Notifications',
            description: 'Show activity notifications',
        },
        {
            key: 'soundEnabled' as const,
            icon: Volume2,
            label: 'Sounds',
            description: 'Play notification sounds',
        },
        {
            key: 'compactMode' as const,
            icon: Rows3,
            label: 'Compact Mode',
            description: 'Reduce spacing in chat messages',
        },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-midnight border-white/5 text-white">
                <DialogHeader>
                    <DialogTitle className="font-heading text-xl text-white">Settings</DialogTitle>
                    <DialogDescription className="text-slate-grey">Manage your preferences and application data</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Appearance */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-grey uppercase tracking-wider">Appearance</label>
                        <div className="grid grid-cols-3 gap-2">
                            {themeOptions.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => handleThemeChange(option.value)}
                                    className={cn(
                                        "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
                                        settings.theme === option.value
                                            ? "border-neurix-orange/50 bg-neurix-orange/10 text-white"
                                            : "border-white/5 bg-white/5 text-slate-grey hover:bg-white/10 hover:text-white"
                                    )}
                                >
                                    <option.icon
                                        className={cn(
                                            "w-5 h-5",
                                            settings.theme === option.value ? "text-neurix-orange" : "text-slate-grey"
                                        )}
                                    />
                                    <span className="text-xs font-medium">{option.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <Separator className="bg-white/5" />

                    {/* Toggles */}
                    <div className="space-y-4">
                        {toggleOptions.map((option) => (
                            <div key={option.key} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                        <option.icon className="w-4 h-4 text-slate-grey" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">{option.label}</p>
                                        <p className="text-xs text-slate-grey">{option.description}</p>
                                    </div>
                                </div>
                                <Toggle
                                    enabled={settings[option.key]}
                                    onToggle={() => onSave({ ...settings, [option.key]: !settings[option.key] })}
                                    label={option.label}
                                />
                            </div>
                        ))}
                    </div>

                    <Separator className="bg-white/5" />

                    {/* About */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-grey uppercase tracking-wider">About</label>
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                            <Info className="w-4 h-4 text-neurix-orange mt-0.5 shrink-0" />
                            <div className="text-xs text-slate-grey space-y-1">
                                <p><strong className="text-white">Neurix</strong> v1.0.0</p>
                                <p>AI-powered MCP chat interface for connecting and managing your services through natural conversation.</p>
                                <p className="opacity-70">Built with React, TypeScript, and the Model Context Protocol.</p>
                            </div>
                        </div>
                    </div>

                    <Separator className="bg-white/5" />

                    {/* Danger Zone */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-red-400 uppercase tracking-wider">Danger Zone</label>
                        <Button
                            variant="outline"
                            className="w-full border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/30 bg-transparent"
                            onClick={onClearData}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Clear All Data
                        </Button>
                        <p className="text-[10px] text-slate-grey text-center">
                            This will remove all chats, connections, and settings permanently.
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
