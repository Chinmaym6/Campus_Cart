import { useState, useEffect, useRef, useCallback, useContext, createContext } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './useAuth';
import { toast } from 'react-toastify';

// Socket Context
const SocketContext = createContext(null);

// Socket Provider Component
export const SocketProvider = ({ children }) => {
    const { user, isAuthenticated } = useAuth();
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const reconnectTimeoutRef = useRef(null);

    // Initialize socket connection
    useEffect(() => {
        if (!isAuthenticated || !user) {
            // Disconnect if user is not authenticated
            if (socket) {
                socket.disconnect();
                setSocket(null);
                setConnected(false);
                setOnlineUsers([]);
            }
            return;
        }

        const token = localStorage.getItem('accessToken');
        if (!token) return;

        // Create socket connection
        const newSocket = io(process.env.REACT_APP_SOCKET_URL || '', {
            auth: {
                token: token
            },
            transports: ['websocket', 'polling'],
            timeout: 20000,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            maxReconnectionAttempts: 5
        });

        // Connection event handlers
        newSocket.on('connect', () => {
            console.log('🔌 Socket connected:', newSocket.id);
            setConnected(true);
            setSocket(newSocket);
            
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
        });

        newSocket.on('disconnect', (reason) => {
            console.log('🔌 Socket disconnected:', reason);
            setConnected(false);
            
            if (reason === 'io server disconnect') {
                // Server initiated disconnect, try to reconnect
                newSocket.connect();
            }
        });

        newSocket.on('connect_error', (error) => {
            console.error('🔌 Socket connection error:', error);
            setConnected(false);
            
            if (error.message === 'Authentication error: Token expired') {
                // Token expired, user needs to login again
                toast.error('Session expired. Please login again.');
                // You might want to trigger logout here
            }
        });

        // Global event listeners
        newSocket.on('notification', (notification) => {
            setNotifications(prev => [notification, ...prev]);
            
            // Show toast notification
            toast.info(notification.message, {
                onClick: () => {
                    // Handle notification click
                    console.log('Notification clicked:', notification);
                }
            });
        });

        newSocket.on('user_status_change', (data) => {
            setOnlineUsers(prev => {
                if (data.status === 'offline') {
                    return prev.filter(userId => userId !== data.userId);
                } else {
                    return prev.includes(data.userId) ? prev : [...prev, data.userId];
                }
            });
        });

        newSocket.on('broadcast_notification', (data) => {
            toast.info(data.message);
        });

        // Cleanup function
        return () => {
            if (newSocket) {
                newSocket.disconnect();
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [isAuthenticated, user, socket]);

    // Clear notifications
    const clearNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    // Remove specific notification
    const removeNotification = useCallback((notificationId) => {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }, []);

    const value = {
        socket,
        connected,
        onlineUsers,
        notifications,
        clearNotifications,
        removeNotification
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};

// useSocket hook
export const useSocket = () => {
    const context = useContext(SocketContext);
    
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }

    return context;
};

/**
 * Hook for socket event handling
 * @param {string} eventName - Event name to listen for
 * @param {Function} handler - Event handler function
 * @param {Array} deps - Dependencies array
 */
export const useSocketEvent = (eventName, handler, deps = []) => {
    const { socket } = useSocket();

    useEffect(() => {
        if (!socket || !eventName || !handler) return;

        socket.on(eventName, handler);

        return () => {
            socket.off(eventName, handler);
        };
    }, [socket, eventName, handler, ...deps]);
};

/**
 * Hook for emitting socket events
 * @returns {Function} Emit function
 */
export const useSocketEmit = () => {
    const { socket, connected } = useSocket();

    const emit = useCallback((eventName, data) => {
        if (!socket || !connected) {
            console.warn('Socket not connected, cannot emit event:', eventName);
            return false;
        }

        socket.emit(eventName, data);
        return true;
    }, [socket, connected]);

    return emit;
};

/**
 * Hook for real-time messaging
 * @param {string} conversationId - Conversation ID
 * @returns {Object} Messaging state and methods
 */
export const useSocketMessaging = (conversationId) => {
    const { socket } = useSocket();
    const emit = useSocketEmit();
    const [messages, setMessages] = useState([]);
    const [typing, setTyping] = useState({});

    // Listen for new messages
    useSocketEvent('receive_message', (message) => {
        if (message.conversationId === conversationId) {
            setMessages(prev => [...prev, message]);
        }
    }, [conversationId]);

    // Listen for typing indicators
    useSocketEvent('user_typing', (data) => {
        if (data.conversationId === conversationId) {
            setTyping(prev => ({
                ...prev,
                [data.userId]: data.isTyping
            }));

            // Clear typing indicator after timeout
            if (data.isTyping) {
                setTimeout(() => {
                    setTyping(prev => ({
                        ...prev,
                        [data.userId]: false
                    }));
                }, 3000);
            }
        }
    }, [conversationId]);

    // Send message
    const sendMessage = useCallback((content, recipientId) => {
        return emit('send_message', {
            content,
            recipientId,
            conversationId
        });
    }, [emit, conversationId]);

    // Send typing indicator
    const startTyping = useCallback((recipientId) => {
        return emit('typing_start', {
            recipientId,
            conversationId
        });
    }, [emit, conversationId]);

    const stopTyping = useCallback((recipientId) => {
        return emit('typing_stop', {
            recipientId,
            conversationId
        });
    }, [emit, conversationId]);

    return {
        messages,
        typing,
        sendMessage,
        startTyping,
        stopTyping
    };
};

export default useSocket;
