import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  // Persistent participant ID per browser session
  const [participantId] = useState(() => {
    let id = sessionStorage.getItem('consensus_participant_id');
    if (!id) {
      id = 'user_' + Math.random().toString(36).substring(2, 10);
      sessionStorage.setItem('consensus_participant_id', id);
    }
    return id;
  });

  useEffect(() => {
    // Initialize socket connection
    const socketInstance = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 5000,
      autoConnect: true
    });

    socketInstance.on('connect', () => {
      console.log('[Socket] Connected to server:', socketInstance.id);
      setIsConnected(true);
      setConnectionError(null);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('[Socket] Running in offline fallback mode:', err.message);
      setIsConnected(false);
      setConnectionError(err.message);
    });

    setSocket(socketInstance);

    return () => {
      console.log('[Socket] Cleaning up socket connection...');
      socketInstance.disconnect();
    };
  }, []);

  const emit = useCallback((event, payload) => {
    if (socket && isConnected) {
      socket.emit(event, payload);
    } else {
      console.log(`[Socket:Offline Mock] Emitted '${event}':`, payload);
    }
  }, [socket, isConnected]);

  const on = useCallback((event, callback) => {
    if (socket) {
      socket.on(event, callback);
    }
  }, [socket]);

  const off = useCallback((event, callback) => {
    if (socket) {
      socket.off(event, callback);
    }
  }, [socket]);

  return (
    <SocketContext.Provider
      value={{
        socket,
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
