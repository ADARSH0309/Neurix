import type { ReactNode } from 'react';
import { useUI } from '../../context/UIContext';
import { useServer } from '../../context/ServerContext';
import { NavigationDock } from '../navigation/NavigationDock';
import { ToolsHUD } from '../tools/ToolsHUD';
import { BackgroundLayer } from './BackgroundLayer';
import { Header } from '../Header';
import { SettingsDialog } from '../SettingsDialog';
import { ProfileDialog } from '../ProfileDialog';
import { MobileTabBar } from '../navigation/MobileTabBar';

interface MainLayoutProps {
    children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
    const {
        resolvedTheme,
        isToolsPanelOpen,
        setIsToolsPanelOpen,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        showProfileDialog,
        setShowProfileDialog,
        showSettingsDialog,
        setShowSettingsDialog,
        settings,
        updateSettings,
        profile,
        updateProfile,
        activities,
        markAllNotificationsRead,
        clearAllData,
        backToLanding,
    } = useUI();

    const { servers } = useServer();
    const connectedServers = Object.values(servers).filter(s => s.connected).length;
    const unreadCount = activities.filter(a => !a.read).length;

    return (
        <div className="relative w-full h-screen overflow-hidden bg-background text-foreground font-sans selection:bg-primary/30 selection:text-white">
            {/* Ambient Background */}
            <BackgroundLayer />

            {/* Outer flex-col: Header on top, then row */}
            <div className="relative z-10 flex flex-col w-full h-full">
                {/* Header */}
                <Header
                    profile={profile}
                    theme={resolvedTheme}
                    onToggleSidebar={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    isSidebarOpen={isMobileMenuOpen}
                    connectedServers={connectedServers}
                    activities={activities}
                    unreadCount={unreadCount}
                    onMarkAllRead={markAllNotificationsRead}
                    onOpenProfile={() => setShowProfileDialog(true)}
                    onOpenSettings={() => setShowSettingsDialog(true)}
                    onBackToLanding={backToLanding}
                />

                {/* Main Content Row */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Navigation Dock (Left) - hidden on mobile unless toggled */}
                    <div className="hidden md:flex">
                        <NavigationDock />
                    </div>

                    {/* Mobile Navigation Overlay */}
                    {isMobileMenuOpen && (
                        <div className="fixed inset-0 z-50 md:hidden">
                            <div
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                                onClick={() => setIsMobileMenuOpen(false)}
                            />
                            <div className="relative z-10 h-full w-72">
                                <NavigationDock />
                            </div>
                        </div>
                    )}

                    {/* Stage (Center) */}
                    <main className="flex-1 relative flex flex-col h-full overflow-hidden transition-all duration-500 ease-out p-2 md:p-4 lg:p-6">
                        <div className="flex-1 w-full max-w-5xl mx-auto h-full flex flex-col relative">
                            {children}
                        </div>
                    </main>

                    {/* HUD (Right) */}
                    <ToolsHUD
                        isOpen={isToolsPanelOpen}
                        onClose={() => setIsToolsPanelOpen(false)}
                    />
                </div>

                {/* Mobile Tab Bar */}
                <MobileTabBar />
            </div>

            {/* Dialogs */}
            <SettingsDialog
                open={showSettingsDialog}
                onOpenChange={setShowSettingsDialog}
                settings={settings}
                onSave={updateSettings}
                onClearData={clearAllData}
            />
            <ProfileDialog
                open={showProfileDialog}
                onOpenChange={setShowProfileDialog}
                profile={profile}
                onSave={updateProfile}
            />
        </div>
    );
}
