import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { formatDistanceToNow } from 'date-fns';
import { FiSearch, FiUser, FiMessageCircle } from 'react-icons/fi';
import './ChatList.css';

const ChatList = ({ 
    conversations, 
    selectedConversation, 
    onSelectConversation, 
    onNewConversation,
    loading = false,
    searchQuery = '',
    onSearchChange
}) => {
    const { user } = useAuth();
    const { socket, onlineUsers } = useSocket();
    const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

    // Filter conversations based on search query
    const filteredConversations = useMemo(() => {
        if (!localSearchQuery.trim()) return conversations;
        
        return conversations.filter(conv => {
            const otherUser = conv.participants.find(p => p.id !== user.id);
            const searchTerm = localSearchQuery.toLowerCase();
            
            return (
                otherUser?.firstName?.toLowerCase().includes(searchTerm) ||
                otherUser?.lastName?.toLowerCase().includes(searchTerm) ||
                conv.lastMessage?.content?.toLowerCase().includes(searchTerm) ||
                conv.item?.title?.toLowerCase().includes(searchTerm)
            );
        });
    }, [conversations, localSearchQuery, user.id]);

    // Handle search input change
    const handleSearchChange = (e) => {
        const value = e.target.value;
        setLocalSearchQuery(value);
        if (onSearchChange) {
            onSearchChange(value);
        }
    };

    // Get other participant info
    const getOtherParticipant = (conversation) => {
        return conversation.participants.find(p => p.id !== user.id);
    };

    // Check if user is online
    const isUserOnline = (userId) => {
        return onlineUsers.includes(userId);
    };

    // Format last message time
    const formatLastMessageTime = (timestamp) => {
        if (!timestamp) return '';
        
        try {
            return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
        } catch (error) {
            return '';
        }
    };

    // Get conversation title
    const getConversationTitle = (conversation) => {
        const otherUser = getOtherParticipant(conversation);
        if (!otherUser) return 'Unknown User';
        
        return `${otherUser.firstName} ${otherUser.lastName}`;
    };

    // Get conversation subtitle (last message or item info)
    const getConversationSubtitle = (conversation) => {
        if (conversation.lastMessage) {
            const isOwn = conversation.lastMessage.senderId === user.id;
            const prefix = isOwn ? 'You: ' : '';
            return `${prefix}${conversation.lastMessage.content}`;
        }
        
        if (conversation.item) {
            return `About: ${conversation.item.title}`;
        }
        
        return 'No messages yet';
    };

    if (loading) {
        return (
            <div className="chat-list loading">
                <div className="chat-list-header">
                    <h3>Messages</h3>
                </div>
                <div className="loading-skeleton">
                    {[...Array(5)].map((_, index) => (
                        <div key={index} className="chat-item-skeleton">
                            <div className="avatar-skeleton"></div>
                            <div className="content-skeleton">
                                <div className="title-skeleton"></div>
                                <div className="subtitle-skeleton"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="chat-list">
            {/* Header */}
            <div className="chat-list-header">
                <h3>
                    <FiMessageCircle className="header-icon" />
                    Messages
                </h3>
                <button 
                    className="new-chat-btn"
                    onClick={onNewConversation}
                    title="Start new conversation"
                >
                    <FiUser />
                </button>
            </div>

            {/* Search Bar */}
            <div className="chat-search">
                <div className="search-input-wrapper">
                    <FiSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search conversations..."
                        value={localSearchQuery}
                        onChange={handleSearchChange}
                        className="search-input"
                    />
                </div>
            </div>

            {/* Conversations List */}
            <div className="chat-list-content">
                {filteredConversations.length === 0 ? (
                    <div className="empty-state">
                        {localSearchQuery ? (
                            <>
                                <FiSearch className="empty-icon" />
                                <p>No conversations found</p>
                                <span>Try adjusting your search terms</span>
                            </>
                        ) : (
                            <>
                                <FiMessageCircle className="empty-icon" />
                                <p>No conversations yet</p>
                                <span>Start chatting with other students!</span>
                                <button 
                                    className="start-chat-btn"
                                    onClick={onNewConversation}
                                >
                                    Start a Conversation
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="conversations">
                        {filteredConversations.map((conversation) => {
                            const otherUser = getOtherParticipant(conversation);
                            const isSelected = selectedConversation?.id === conversation.id;
                            const isOnline = isUserOnline(otherUser?.id);
                            const hasUnread = conversation.unreadCount > 0;

                            return (
                                <div
                                    key={conversation.id}
                                    className={`chat-item ${isSelected ? 'selected' : ''} ${hasUnread ? 'unread' : ''}`}
                                    onClick={() => onSelectConversation(conversation)}
                                >
                                    <div className="chat-avatar-wrapper">
                                        <img
                                            src={otherUser?.profilePicture || '/default-avatar.png'}
                                            alt={getConversationTitle(conversation)}
                                            className="chat-avatar"
                                            onError={(e) => {
                                                e.target.src = '/default-avatar.png';
                                            }}
                                        />
                                        {isOnline && <div className="online-indicator"></div>}
                                    </div>

                                    <div className="chat-content">
                                        <div className="chat-header-row">
                                            <h4 className="chat-title">
                                                {getConversationTitle(conversation)}
                                            </h4>
                                            <span className="chat-time">
                                                {formatLastMessageTime(conversation.lastMessage?.createdAt)}
                                            </span>
                                        </div>

                                        <div className="chat-subtitle-row">
                                            <p className="chat-subtitle">
                                                {getConversationSubtitle(conversation)}
                                            </p>
                                            {hasUnread && (
                                                <div className="unread-badge">
                                                    {conversation.unreadCount}
                                                </div>
                                            )}
                                        </div>

                                        {conversation.item && (
                                            <div className="conversation-item-info">
                                                <span className="item-price">
                                                    ${conversation.item.price}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

ChatList.propTypes = {
    conversations: PropTypes.array.isRequired,
    selectedConversation: PropTypes.object,
    onSelectConversation: PropTypes.func.isRequired,
    onNewConversation: PropTypes.func.isRequired,
    loading: PropTypes.bool,
    searchQuery: PropTypes.string,
    onSearchChange: PropTypes.func
};

export default ChatList;
