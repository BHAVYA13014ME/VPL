import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import io, { Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: string[];
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  sendMessage: (roomId: string, message: string, type?: string, replyTo?: string) => void;
  onMessage: (callback: (data: any) => void) => () => void;
  onNotification: (callback: (data: any) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const { user, token } = useAuth();
  // Track current userId so we only reconnect on user change, not every token refresh
  const connectedUserId = useRef<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Only create a new socket when user actually changes (not every token re-issue)
    const userId = user?._id || null;

    if (!user || !token) {
      // Logged out – close existing socket
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        connectedUserId.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Already connected for this user — skip
    if (connectedUserId.current === userId && socketRef.current?.connected) {
      return;
    }

    // Close any existing socket before opening a new one
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const newSocket = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000', {
      auth: { token },
      // Start with polling; upgrade to WebSocket after handshake —
      // this avoids "WebSocket closed before connection established"
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      connectedUserId.current = userId;
      console.log('Socket connected');
    });

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('Socket disconnected:', reason);
    });

    newSocket.on('connect_error', (err) => {
      console.warn('Socket connect error:', err.message);
      setIsConnected(false);
    });

    newSocket.on('userOnline', (userId: string) => {
      setOnlineUsers(prev => [...prev.filter(id => id !== userId), userId]);
    });

    newSocket.on('userOffline', (userId: string) => {
      setOnlineUsers(prev => prev.filter(id => id !== userId));
    });

    newSocket.on('onlineUsers', (users: string[]) => {
      setOnlineUsers(users);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
      connectedUserId.current = null;
    };
  // Only reconnect when the actual user id changes, not token reference
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  const joinRoom = (roomId: string) => {
    if (socket) {
      socket.emit('join_room', { roomId });
    }
  };

  const leaveRoom = (roomId: string) => {
    if (socket) {
      socket.emit('leave_room', { roomId });
    }
  };

  const sendMessage = (roomId: string, message: string, type = 'text', replyTo?: string) => {
    if (socket) {
      socket.emit('send_message', { roomId, content: message, type, replyTo });
    }
  };

  const onMessage = (callback: (data: any) => void) => {
    if (socket) {
      socket.on('new_message', callback);
      return () => socket.off('new_message', callback);
    }
    return () => {};
  };

  const onNotification = (callback: (data: any) => void) => {
    if (socket) {
      socket.on('notification', callback);
      return () => socket.off('notification', callback);
    }
    return () => {};
  };

  const value = {
    socket,
    isConnected,
    onlineUsers,
    joinRoom,
    leaveRoom,
    sendMessage,
    onMessage,
    onNotification,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
