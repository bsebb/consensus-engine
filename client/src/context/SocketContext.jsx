import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../utils/api';
import { getPersistentDeviceId, getRoomParticipantId, setRoomParticipantId } from '../utils/deviceId';

const SocketContext = createContext(null);
const SERVER_URL = API_BASE_URL;

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);
  const pendingEmitsRef = useRef([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  // Persistent account-free hardware/browser device identifier (stored in localStorage + 400-day cookie)
  const [deviceId] = useState(() => getPersistentDeviceId());

  // Fallback session participant ID when not yet scoped to a specific room PIN
  const [participantId] = useState(() => getRoomParticipantId(null));

  useEffect(() => {
    // Initialize socket connection
    const socketInstance = io(SERVER_URL, {
      transports: import.meta.env.VITE_SOCKET_POLLING === 'true' ? ['websocket', 'polling'] : ['websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 8000,
      autoConnect: true,
    });

    socketInstance.on('connect', () => {
      console.log('[Socket] Connected to server:', socketInstance.id, 'via', SERVER_URL || 'default proxy');
      setIsConnected(true);
      setConnectionError(null);
      while (pendingEmitsRef.current.length > 0) {
        const item = pendingEmitsRef.current.shift();
        if (item) {
          socketInstance.emit(item.event, item.payload);
        }
      }
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('[Socket] Connection error notice:', err.message);
      setIsConnected(false);
      setConnectionError(err.message);
    });

    const heartbeat = setInterval(() => {
      if (!socketInstance.connected || document.visibilityState === 'hidden') return;
      const pin = localStorage.getItem('consensus_active_pin');
      if (pin) socketInstance.emit('heartbeat', { pin, participant_id: getRoomParticipantId(pin) });
    }, 20000);

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    return () => {
      clearInterval(heartbeat);
      socketInstance.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, []);

  const emit = useCallback((event, payload) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(event, payload);
    } else if (socketRef.current) {
      socketRef.current.emit(event, payload);
    } else {
      pendingEmitsRef.current.push({ event, payload });
    }
  }, []);

  const on = useCallback((event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  }, []);

  const off = useCallback((event, callback) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  }, []);

  const contextValue = useMemo(() => ({
    socket,
    isConnected,
    connectionError,
    deviceId,
    participantId,
    getRoomParticipantId,
    setRoomParticipantId,
    emit,
    on,
    off,
  }), [socket, isConnected, connectionError, deviceId, participantId, emit, on, off]);

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
