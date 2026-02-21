import { useEffect } from 'react';
import { useUI } from '../context/UIContext';
import { useChat } from '../context/ChatContext';

export function useKeyboardShortcuts() {
    const {
        setShowSettingsDialog,
        setIsToolsPanelOpen,
        isToolsPanelOpen,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        showSettingsDialog,
        showProfileDialog,
        setShowProfileDialog,
    } = useUI();

    const { createSession } = useChat();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isInInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

            // Escape: close dialogs/panels, blur input
            if (e.key === 'Escape') {
                if (showSettingsDialog) {
                    setShowSettingsDialog(false);
                    return;
                }
                if (showProfileDialog) {
                    setShowProfileDialog(false);
                    return;
                }
                if (isMobileMenuOpen) {
                    setIsMobileMenuOpen(false);
                    return;
                }
                if (isInInput) {
                    (target as HTMLElement).blur();
                    return;
                }
            }

            // / → focus command input (when not in an input)
            if (e.key === '/' && !isInInput) {
                e.preventDefault();
                const input = document.querySelector('[data-command-input]') as HTMLTextAreaElement;
                input?.focus();
                return;
            }

            // Ctrl/Cmd shortcuts
            const mod = e.ctrlKey || e.metaKey;
            if (!mod) return;

            switch (e.key) {
                case 'n':
                case 'N':
                    e.preventDefault();
                    createSession();
                    break;
                case ',':
                    e.preventDefault();
                    setShowSettingsDialog(true);
                    break;
                case '.':
                    e.preventDefault();
                    setIsToolsPanelOpen(!isToolsPanelOpen);
                    break;
                case 'b':
                case 'B':
                    e.preventDefault();
                    setIsMobileMenuOpen(!isMobileMenuOpen);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        showSettingsDialog, showProfileDialog, isMobileMenuOpen, isToolsPanelOpen,
        setShowSettingsDialog, setShowProfileDialog, setIsMobileMenuOpen, setIsToolsPanelOpen,
        createSession,
    ]);
}
