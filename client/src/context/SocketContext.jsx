import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

const getSocketUrl = () => {
  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL;
  }
  // When running on standard Vite port 5173, backend is on port 3000 of the same host
  if (typeof window !== 'undefined' && window.location.port === '5173') {
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }
  return '';
};

const SERVER_URL = getSocketUrl();

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  // Persistent participant ID per browser session
const [participantId] = useState(() => {
  let id = sessionStorage.getItem('consensus_participant_id');

  // UUID compliant generator with fallback for non-secure HTTP contexts on LAN/mobile
  if (!id) {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      id = crypto.randomUUID();
    } else {
      id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }
    sessionStorage.setItem('consensus_participant_id', id);
  }

  return id;
});

  useEffect(() => {
    // Initialize socket connection
    const socketInstance = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 8000,
      autoConnect: true
    });

    socketInstance.on('connect', () => {
      console.log('[Socket] Connected to server:', socketInstance.id, 'via', SERVER_URL || 'default proxy');
      setIsConnected(true);
      setConnectionError(null);
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

    socketRef.current = socketInstance;

    return () => {
      if (socketInstance.connected) {
        socketInstance.disconnect();
      } else {
        socketInstance.once('connect', () => {
          socketInstance.disconnect();
        });
      }
    };
  }, []);

  const emit = useCallback((event, payload) => {
    if (socketRef.current) {
      socketRef.current.emit(event, payload);
    } else {
      console.log(`[Socket:Offline Mock] Emitted '${event}':`, payload);
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

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        connectionError,
        participantId,
        emit,
        on,
        off
      }}
    >
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
