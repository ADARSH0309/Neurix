import { MessageSquare, Zap, Terminal, Settings } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { cn } from '../../lib/utils';

export function MobileTabBar() {
    const { setIsMobileMenuOpen, setIsToolsPanelOpen, isToolsPanelOpen, setShowSettingsDialog } = useUI();

    const tabs = [
        { id: 'chat', label: 'Chat', icon: MessageSquare, onClick: () => setIsMobileMenuOpen(false), active: false },
        { id: 'integrations', label: 'Systems', icon: Zap, onClick: () => setIsMobileMenuOpen(true), active: false },
        { id: 'tools', label: 'Tools', icon: Terminal, onClick: () => setIsToolsPanelOpen(!isToolsPanelOpen), active: isToolsPanelOpen },
        { id: 'settings', label: 'Settings', icon: Settings, onClick: () => setShowSettingsDialog(true), active: false },
    ];

    return (
        <div className="md:hidden border-t border-white/5 glass-panel safe-area-bottom">
            <div className="flex items-center justify-around h-14">
                {tabs.map(tab => (
                    <button
                        key={tab.id} onClick={tab.onClick}
                        className={cn(
                            "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors",
                            tab.active ? "text-neurix-orange" : "text-slate-grey hover:text-white"
                        )}
                    >
                        <tab.icon className="w-5 h-5" />
                        <span className="text-[10px] font-mono font-medium uppercase tracking-wider">{tab.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
