import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';

// Create Socket Context
const SocketContext = createContext(null);

// Socket Provider Component
export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const { user, isAuthenticated } = useAuth();

    useEffect(() => {
        if (isAuthenticated && user) {
            // Initialize socket connection
            const socketInstance = io(process.env.REACT_APP_SOCKET_URL || '', {
                path: '/socket.io',
                transports: ['websocket', 'polling'],
                withCredentials: true,
                auth: {
                    token: localStorage.getItem('accessToken'),
                    userId: user.id
                }
            });

            // Connection event handlers
            socketInstance.on('connect', () => {
                console.log('Socket connected:', socketInstance.id);
                setIsConnected(true);
                setSocket(socketInstance);
            });

            socketInstance.on('disconnect', (reason) => {
                console.log('Socket disconnected:', reason);
                setIsConnected(false);
            });

            socketInstance.on('connect_error', (error) => {
                console.error('Socket connection error:', error);
                setIsConnected(false);
                toast.error('Connection error. Some features may not work.');
            });

            // Online users tracking
            socketInstance.on('userOnline', (userId) => {
                setOnlineUsers(prev => [...new Set([...prev, userId])]);
            });

            socketInstance.on('userOffline', (userId) => {
                setOnlineUsers(prev => prev.filter(id => id !== userId));
            });

            socketInstance.on('onlineUsers', (users) => {
                setOnlineUsers(users);
            });

            // Notification handlers
            socketInstance.on('notification', (notification) => {
                toast.info(notification.message);
            });

            socketInstance.on('newMessage', (message) => {
                // Handle new message notification
                if (Notification.permission === 'granted') {
                    new Notification(`New message from ${message.senderName}`, {
                        body: message.content,
                        icon: '/logo192.png'
                    });
                }
            });

            return () => {
                socketInstance.disconnect();
                setSocket(null);
                setIsConnected(false);
                setOnlineUsers([]);
            };
        }
    }, [isAuthenticated, user]);

    // Socket utility functions
    const emitEvent = (eventName, data) => {
        if (socket && isConnected) {
            socket.emit(eventName, data);
        }
    };

    const joinRoom = (roomId) => {
        if (socket && isConnected) {
            socket.emit('joinRoom', roomId);
        }
    };

    const leaveRoom = (roomId) => {
        if (socket && isConnected) {
            socket.emit('leaveRoom', roomId);
        }
    };

    const sendMessage = (messageData) => {
        if (socket && isConnected) {
            socket.emit('sendMessage', messageData);
        }
    };

    const value = {
        socket,
        isConnected,
        onlineUsers,
        emitEvent,
        joinRoom,
        leaveRoom,
        sendMessage
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};

// Custom hook to use socket context
export const useSocket = () => {
    const context = useContext(SocketContext);
    
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }

    return context;
};

export default SocketContext;
