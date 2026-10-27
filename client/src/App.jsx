import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { SocketProvider } from './context/SocketContext';
import { ToastProvider } from './components/ui/Toast';
import InstallPrompt from './components/ui/InstallPrompt';
import MobileNav from './components/ui/MobileNav';
import ErrorBoundary from './components/ui/ErrorBoundary';
import JoinRoom from './pages/JoinRoom';
import RoomLobby from './pages/RoomLobby';
import SwipeDeck from './pages/SwipeDeck';
import History from './pages/History';
import { initGlobalIosHaptics } from './utils/haptics';

const Dashboard = lazy(() => import('./pages/Dashboard'));

function AppFrame({ children }) {
  const { pathname } = useLocation();
  return <div className={pathname === '/dashboard' ? 'dashboard-shell' : 'pwa-shell'}>{children}</div>;
}

function App() {
  useEffect(() => {
    initGlobalIosHaptics();
  }, []);

  return (
    <ThemeProvider>
      <LanguageProvider>
        <SocketProvider>
          <ToastProvider>
            <BrowserRouter>
              <AppFrame>
                <ErrorBoundary>
                  <Routes>
                    <Route path="/" element={<JoinRoom />} />
                    <Route path="/j/:pin" element={<JoinRoom />} />
                    <Route path="/host" element={<Navigate to="/" replace />} />
                    <Route path="/lobby" element={<RoomLobby />} />
                    <Route path="/lobby/:pin" element={<RoomLobby />} />
                    <Route path="/deck/:pin" element={<SwipeDeck />} />
                    <Route path="/history" element={<History />} />
                    <Route path="/dashboard" element={<Suspense fallback={<div role="status">Loading…</div>}><Dashboard /></Suspense>} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </ErrorBoundary>
                <MobileNav />
                <InstallPrompt />
              </AppFrame>
            </BrowserRouter>
          </ToastProvider>
        </SocketProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
