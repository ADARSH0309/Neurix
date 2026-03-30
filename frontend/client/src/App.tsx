import { UIProvider } from './context/UIContext';
import { ServerProvider } from './context/ServerContext';
import { ChatProvider } from './context/ChatContext';
import { MainLayout } from './components/layout/MainLayout';
import { ChatStage } from './components/chat/ChatStage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import './main.css';

function AppContent() {
    useKeyboardShortcuts();

    return (
        <MainLayout>
            <ErrorBoundary>
                <ChatStage />
            </ErrorBoundary>
        </MainLayout>
    );
}

function App() {
    return (
        <ErrorBoundary>
            <UIProvider>
                <ServerProvider>
                    <ChatProvider>
                        <AppContent />
                    </ChatProvider>
                </ServerProvider>
            </UIProvider>
        </ErrorBoundary>
    );
}

export default App;
