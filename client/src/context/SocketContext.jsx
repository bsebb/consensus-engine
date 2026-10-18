import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../utils/api';

const SocketContext = createContext(null);
const SERVER_URL = API_BASE_URL;

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
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
      autoConnect: true,
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
    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
      socketRef.current = null;
      setSocket(null);
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

  const contextValue = useMemo(() => ({
    socket,
    isConnected,
    connectionError,
    participantId,
    emit,
    on,
    off,
  }), [socket, isConnected, connectionError, participantId, emit, on, off]);

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
