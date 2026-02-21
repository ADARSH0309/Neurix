import { UIProvider } from './context/UIContext';
import { ServerProvider } from './context/ServerContext';
import { ChatProvider } from './context/ChatContext';
import { MainLayout } from './components/layout/MainLayout';
import { ChatStage } from './components/chat/ChatStage';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import './main.css';

function AppContent() {
    useKeyboardShortcuts();

    return (
        <MainLayout>
            <ChatStage />
        </MainLayout>
    );
}

function App() {
    return (
        <UIProvider>
            <ServerProvider>
                <ChatProvider>
                    <AppContent />
                </ChatProvider>
            </ServerProvider>
        </UIProvider>
    );
}

export default App;
