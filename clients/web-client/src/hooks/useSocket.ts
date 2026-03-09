import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const useSocket = (token: string | null) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      // Disconnect if no token
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Create socket connection
    const socket = io(SOCKET_URL, {
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Socket connected');
      setIsConnected(true);
      
      // Authenticate socket
      socket.emit('authenticate', token);
    });

    socket.on('authenticated', (data: any) => {
      if (data.success) {
        console.log('✅ Socket authenticated');
      } else {
        console.error('❌ Socket authentication failed:', data.error);
      }
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setIsConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  return { socket: socketRef.current, isConnected };
};
