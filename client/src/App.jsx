import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
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
      <SocketProvider>
        <ToastProvider>
          {/* Dual-Div Ambient Mesh Background */}
          <div className="bg-mesh-container">
            <div className="bg-mesh-light" />
            <div className="bg-mesh-dark" />
          </div>

          <BrowserRouter>
            <div className="pwa-shell">
              <Routes>
                <Route path="/" element={<JoinRoom />} />
                <Route path="/host" element={<HostSettings />} />
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
    </ThemeProvider>
  );
}

export default App;
