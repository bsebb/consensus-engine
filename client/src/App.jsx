import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import JoinRoom from './pages/JoinRoom';
import HostSettings from './pages/HostSettings';
import RoomLobby from './pages/RoomLobby';
import SwipeDeck from './pages/SwipeDeck';

// Lilia: initialize the Socket.io client connection
import './socket';
function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<JoinRoom />} />
          <Route path="/host" element={<HostSettings />} />
          <Route path="/lobby/:pin" element={<RoomLobby />} />
          <Route path="/deck/:pin" element={<SwipeDeck />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
