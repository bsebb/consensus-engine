import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';
import JoinRoom from './pages/JoinRoom';
import HostSettings from './pages/HostSettings';
import RoomLobby from './pages/RoomLobby';
import SwipeDeck from './pages/SwipeDeck';
import History from './pages/History';

function App() {
  return (
    <ThemeProvider>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<JoinRoom />} />
            <Route path="/host" element={<HostSettings />} />
            <Route path="/lobby/:pin" element={<RoomLobby />} />
            <Route path="/deck/:pin" element={<SwipeDeck />} />
            <Route path="/history" element={<History />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </ThemeProvider>
  );
}

export default App;
