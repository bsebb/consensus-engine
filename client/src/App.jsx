import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { SocketProvider } from './context/SocketContext';
import { ToastProvider } from './components/ui/Toast';
import InstallPrompt from './components/ui/InstallPrompt';
import MobileNav from './components/ui/MobileNav';
import JoinRoom from './pages/JoinRoom';

const HostSettings = lazy(() => import('./pages/HostSettings'));
const RoomLobby = lazy(() => import('./pages/RoomLobby'));
const SwipeDeck = lazy(() => import('./pages/SwipeDeck'));
const History = lazy(() => import('./pages/History'));

function PageLoader() {
  return (
    <div className="flex-1 min-h-[100dvh] flex items-center justify-center bg-[var(--bg-root)]" aria-busy="true">
      <div className="w-6 h-6 border-2 border-[var(--accent-bg)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <SocketProvider>
          <ToastProvider>
            <BrowserRouter>
              <div className="pwa-shell">
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<JoinRoom />} />
                    <Route path="/host" element={<HostSettings />} />
                    <Route path="/lobby" element={<RoomLobby />} />
                    <Route path="/lobby/:pin" element={<RoomLobby />} />
                    <Route path="/deck/:pin" element={<SwipeDeck />} />
                    <Route path="/history" element={<History />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
                <MobileNav />
                <InstallPrompt />
              </div>
            </BrowserRouter>
          </ToastProvider>
        </SocketProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
