import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { SocketProvider } from './context/SocketContext';
import { ToastProvider } from './components/ui/Toast';
import InstallPrompt from './components/ui/InstallPrompt';
import MobileNav from './components/ui/MobileNav';
import JoinRoom from './pages/JoinRoom';
import HostSettings from './pages/HostSettings';
import RoomLobby from './pages/RoomLobby';
import SwipeDeck from './pages/SwipeDeck';
import History from './pages/History';

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <SocketProvider>
          <ToastProvider>
            <BrowserRouter>
              <div className="pwa-shell">
                <Routes>
                  <Route path="/" element={<JoinRoom />} />
                  <Route path="/host" element={<HostSettings />} />
                  <Route path="/lobby" element={<RoomLobby />} />
                  <Route path="/lobby/:pin" element={<RoomLobby />} />
                  <Route path="/deck/:pin" element={<SwipeDeck />} />
                  <Route path="/history" element={<History />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
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
