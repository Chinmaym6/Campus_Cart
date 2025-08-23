import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import { formatDistanceToNow } from 'date-fns';
import { FiArrowLeft, FiMoreVertical, FiUser, FiShoppingBag } from 'react-icons/fi';
import './ChatWindow.css';

const ChatWindow = ({
    conversation,
    messages,
    onSendMessage,
    onClose,
    onViewProfile,
    onViewItem,
    loading = false,
    isTyping = false,
    typingUser = null
}) => {
    const { user } = useAuth();
    const { socket, onlineUsers } = useSocket();
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const [showScrollButton, setShowScrollButton] = useState(false);

    // Get other participant
    const otherUser = conversation?.participants?.find(p => p.id !== user.id);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    // Handle scroll to show/hide scroll-to-bottom button
    const handleScroll = useCallback(() => {
        if (!messagesContainerRef.current) return;
        
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        
        setShowScrollButton(!isNearBottom);
    }, []);

    // Scroll to bottom manually
    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // Handle typing indicators
    const handleTypingStart = useCallback(() => {
        if (socket && conversation) {
            socket.emit('typing_start', {
                recipientId: otherUser?.id,
                conversationId: conversation.id
            });
        }
    }, [socket, conversation, otherUser]);

    const handleTypingStop = useCallback(() => {
        if (socket && conversation) {
            socket.emit('typing_stop', {
                recipientId: otherUser?.id,
                conversationId: conversation.id
            });
        }
    }, [socket, conversation, otherUser]);

    // Send message handler
    const handleSendMessage = async (content, attachments = []) => {
        if (!content.trim() && attachments.length === 0) return;

        const messageData = {
            content: content.trim(),
            recipientId: otherUser?.id,
            conversationId: conversation.id,
            itemId: conversation.item?.id || null,
            attachments
        };

        try {
            await onSendMessage(messageData);
        } catch (error) {
            console.error('Failed to send message:', error);
            // Handle error (show toast, etc.)
        }
    };

    // Check if user is online
    const isUserOnline = onlineUsers.includes(otherUser?.id);

    // Format last seen
    const getLastSeenText = () => {
        if (isUserOnline) return 'Online';
        if (otherUser?.lastSeen) {
            return `Last seen ${formatDistanceToNow(new Date(otherUser.lastSeen), { addSuffix: true })}`;
        }
        return '';
    };

    // Group messages by date
    const groupMessagesByDate = (messages) => {
        const groups = [];
        let currentGroup = null;

        messages.forEach((message) => {
            const messageDate = new Date(message.createdAt);
            const dateString = messageDate.toDateString();

            if (!currentGroup || currentGroup.date !== dateString) {
                currentGroup = {
                    date: dateString,
                    displayDate: formatDateLabel(messageDate),
                    messages: []
                };
                groups.push(currentGroup);
            }

            currentGroup.messages.push(message);
        });

        return groups;
    };

    // Format date label
    const formatDateLabel = (date) => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
    };

    if (!conversation) {
        return (
            <div className="chat-window empty">
                <div className="empty-chat-state">
                    <FiUser className="empty-icon" />
                    <h3>Select a conversation</h3>
                    <p>Choose a conversation from the list to start messaging</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="chat-window loading">
                <div className="chat-header">
                    <div className="header-left">
                        <div className="avatar-skeleton"></div>
                        <div className="user-info-skeleton">
                            <div className="name-skeleton"></div>
                            <div className="status-skeleton"></div>
                        </div>
                    </div>
                </div>
                <div className="messages-loading">
                    {[...Array(3)].map((_, index) => (
                        <div key={index} className="message-skeleton">
                            <div className="message-bubble-skeleton"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const messageGroups = groupMessagesByDate(messages);

    return (
        <div className="chat-window">
            {/* Header */}
            <div className="chat-header">
                <div className="header-left">
                    <button 
                        className="back-button mobile-only"
                        onClick={onClose}
                    >
                        <FiArrowLeft />
                    </button>
                    
                    <div className="user-avatar-wrapper">
                        <img
                            src={otherUser?.profilePicture || '/default-avatar.png'}
                            alt={`${otherUser?.firstName} ${otherUser?.lastName}`}
                            className="user-avatar"
                            onClick={() => onViewProfile(otherUser?.id)}
                        />
                        {isUserOnline && <div className="online-indicator"></div>}
                    </div>

                    <div className="user-info">
                        <h3 
                            className="user-name clickable"
                            onClick={() => onViewProfile(otherUser?.id)}
                        >
                            {otherUser?.firstName} {otherUser?.lastName}
                        </h3>
                        <p className="user-status">
                            {getLastSeenText()}
                        </p>
                    </div>
                </div>

                <div className="header-right">
                    {conversation.item && (
                        <button 
                            className="view-item-btn"
                            onClick={() => onViewItem(conversation.item.id)}
                            title="View item"
                        >
                            <FiShoppingBag />
                        </button>
                    )}
                    
                    <button className="more-options-btn">
                        <FiMoreVertical />
                    </button>
                </div>
            </div>

            {/* Item Info (if conversation is about an item) */}
            {conversation.item && (
                <div className="conversation-item-info">
                    <img
                        src={conversation.item.images?.[0]?.url || '/placeholder-item.png'}
                        alt={conversation.item.title}
                        className="item-thumbnail"
                    />
                    <div className="item-details">
                        <h4>{conversation.item.title}</h4>
                        <p className="item-price">${conversation.item.price}</p>
                    </div>
                    <button 
                        className="view-item-link"
                        onClick={() => onViewItem(conversation.item.id)}
                    >
                        View Item
                    </button>
                </div>
            )}

            {/* Messages */}
            <div 
                className="chat-messages"
                ref={messagesContainerRef}
                onScroll={handleScroll}
            >
                {messageGroups.map((group, groupIndex) => (
                    <div key={groupIndex} className="message-group">
                        <div className="date-separator">
                            <span>{group.displayDate}</span>
                        </div>
                        
                        {group.messages.map((message) => (
                            <MessageBubble
                                key={message.id}
                                message={message}
                                isOwn={message.senderId === user.id}
                                showAvatar={message.senderId !== user.id}
                                senderAvatar={otherUser?.profilePicture}
                            />
                        ))}
                    </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && typingUser && (
                    <div className="typing-indicator">
                        <div className="typing-avatar">
                            <img
                                src={typingUser.profilePicture || '/default-avatar.png'}
                                alt={typingUser.firstName}
                            />
                        </div>
                        <div className="typing-bubble">
                            <div className="typing-dots">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Scroll to Bottom Button */}
            {showScrollButton && (
                <button 
                    className="scroll-to-bottom-btn"
                    onClick={scrollToBottom}
                >
                    ↓
                </button>
            )}

            {/* Message Input */}
            <MessageInput
                onSendMessage={handleSendMessage}
                onTypingStart={handleTypingStart}
                onTypingStop={handleTypingStop}
                disabled={loading}
                placeholder={`Message ${otherUser?.firstName}...`}
            />
        </div>
    );
};

ChatWindow.propTypes = {
    conversation: PropTypes.object,
    messages: PropTypes.array.isRequired,
    onSendMessage: PropTypes.func.isRequired,
    onClose: PropTypes.func,
    onViewProfile: PropTypes.func.isRequired,
    onViewItem: PropTypes.func.isRequired,
    loading: PropTypes.bool,
    isTyping: PropTypes.bool,
    typingUser: PropTypes.object
};

export default ChatWindow;
