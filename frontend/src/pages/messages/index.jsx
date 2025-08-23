import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Toast from '../../components/common/Toast';
import SearchBar from '../../components/common/SearchBar';
import api from '../../utils/api';
import './index.css';

function MessagesPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { chatId } = useParams();
    
    const [conversations, setConversations] = useState([]);
    const [activeConversation, setActiveConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredConversations, setFilteredConversations] = useState([]);
    const [activeTab, setActiveTab] = useState('all'); // all, unread, archived
    const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        fetchConversations();
    }, [user, navigate]);

    useEffect(() => {
        if (chatId && conversations.length > 0) {
            const conversation = conversations.find(conv => conv.id === chatId);
            if (conversation) {
                setActiveConversation(conversation);
                fetchMessages(chatId);
                markAsRead(chatId);
            }
        }
    }, [chatId, conversations]);

    useEffect(() => {
        filterConversations();
    }, [conversations, searchQuery, activeTab]);

    const fetchConversations = async () => {
        try {
            setLoading(true);
            const response = await api.get('/messages/conversations');
            const convs = response.data.conversations || defaultConversations;
            setConversations(convs);
            
            // Auto-select first conversation if none selected
            if (!chatId && convs.length > 0) {
                navigate(`/messages/${convs[0].id}`, { replace: true });
            }
        } catch (error) {
            console.error('Error fetching conversations:', error);
            setConversations(defaultConversations);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (conversationId) => {
        try {
            const response = await api.get(`/messages/conversations/${conversationId}/messages`);
            setMessages(response.data.messages || defaultMessages);
        } catch (error) {
            console.error('Error fetching messages:', error);
            setMessages(defaultMessages);
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !activeConversation) return;
        
        setSendingMessage(true);
        try {
            const messageData = {
                conversation_id: activeConversation.id,
                message: newMessage.trim(),
                type: 'text'
            };
            
            const response = await api.post('/messages/send', messageData);
            
            // Add message to local state
            const sentMessage = {
                id: response.data.message.id || Date.now(),
                sender_id: user.id,
                message: newMessage.trim(),
                created_at: new Date().toISOString(),
                type: 'text',
                read: false
            };
            
            setMessages(prev => [...prev, sentMessage]);
            setNewMessage('');
            
            // Update conversation last message
            setConversations(prev => prev.map(conv =>
                conv.id === activeConversation.id
                    ? { 
                        ...conv, 
                        last_message: newMessage.trim(),
                        last_message_time: new Date().toISOString(),
                        unread_count: 0
                    }
                    : conv
            ));
            
        } catch (error) {
            console.error('Error sending message:', error);
            showToast('Failed to send message', 'error');
        } finally {
            setSendingMessage(false);
        }
    };

    const markAsRead = async (conversationId) => {
        try {
            await api.put(`/messages/conversations/${conversationId}/read`);
            
            // Update local state
            setConversations(prev => prev.map(conv =>
                conv.id === conversationId
                    ? { ...conv, unread_count: 0 }
                    : conv
            ));
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const filterConversations = () => {
        let filtered = conversations;
        
        // Filter by tab
        if (activeTab === 'unread') {
            filtered = filtered.filter(conv => conv.unread_count > 0);
        } else if (activeTab === 'archived') {
            filtered = filtered.filter(conv => conv.archived);
        } else {
            filtered = filtered.filter(conv => !conv.archived);
        }
        
        // Filter by search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(conv =>
                conv.other_user?.name?.toLowerCase().includes(query) ||
                conv.last_message?.toLowerCase().includes(query)
            );
        }
        
        setFilteredConversations(filtered);
    };

    const archiveConversation = async (conversationId) => {
        try {
            await api.put(`/messages/conversations/${conversationId}/archive`);
            
            setConversations(prev => prev.map(conv =>
                conv.id === conversationId
                    ? { ...conv, archived: !conv.archived }
                    : conv
            ));
            
            showToast('Conversation archived', 'success');
        } catch (error) {
            console.error('Error archiving conversation:', error);
            showToast('Error archiving conversation', 'error');
        }
    };

    const deleteConversation = async (conversationId) => {
        if (!window.confirm('Are you sure you want to delete this conversation?')) return;
        
        try {
            await api.delete(`/messages/conversations/${conversationId}`);
            
            setConversations(prev => prev.filter(conv => conv.id !== conversationId));
            
            if (activeConversation?.id === conversationId) {
                const remaining = conversations.filter(conv => conv.id !== conversationId);
                if (remaining.length > 0) {
                    navigate(`/messages/${remaining[0].id}`, { replace: true });
                } else {
                    navigate('/messages', { replace: true });
                }
            }
            
            showToast('Conversation deleted', 'success');
        } catch (error) {
            console.error('Error deleting conversation:', error);
            showToast('Error deleting conversation', 'error');
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const showToast = (message, type = 'info') => {
        setToast({ show: true, message, type });
    };

    const closeToast = () => {
        setToast({ show: false, message: '', type: 'info' });
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);
        
        if (diffInHours < 24) {
            return date.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            });
        } else if (diffInHours < 168) { // 1 week
            return date.toLocaleDateString('en-US', { weekday: 'short' });
        } else {
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            });
        }
    };

    // Default data for demo
    const defaultConversations = [
        {
            id: '1',
            other_user: {
                id: '2',
                name: 'Sarah Johnson',
                avatar: null,
                online: true
            },
            last_message: 'Is the textbook still available?',
            last_message_time: new Date().toISOString(),
            unread_count: 2,
            archived: false,
            context: 'marketplace'
        },
        {
            id: '2',
            other_user: {
                id: '3',
                name: 'Mike Chen',
                avatar: null,
                online: false
            },
            last_message: 'Thanks for being a great roommate!',
            last_message_time: new Date(Date.now() - 3600000).toISOString(),
            unread_count: 0,
            archived: false,
            context: 'roommate'
        }
    ];

    const defaultMessages = [
        {
            id: '1',
            sender_id: '2',
            message: 'Hi! I saw your listing for the calculus textbook.',
            created_at: new Date(Date.now() - 7200000).toISOString(),
            type: 'text',
            read: true
        },
        {
            id: '2',
            sender_id: user?.id,
            message: 'Yes, it\'s still available! Are you interested?',
            created_at: new Date(Date.now() - 3600000).toISOString(),
            type: 'text',
            read: true
        },
        {
            id: '3',
            sender_id: '2',
            message: 'Is the textbook still available?',
            created_at: new Date().toISOString(),
            type: 'text',
            read: false
        }
    ];

    if (loading) {
        return <LoadingSpinner message="Loading messages..." overlay />;
    }

    return (
        <>
            <Helmet>
                <title>Messages - Campus Cart</title>
                <meta name="description" content="Manage your Campus Cart messages and conversations with other students." />
            </Helmet>

            <div className="messages-page">
                <div className="messages-container">
                    {/* Conversations Sidebar */}
                    <aside className="conversations-sidebar">
                        <div className="sidebar-header">
                            <h2>💬 Messages</h2>
                            <button className="new-message-btn" title="New Message">
                                ✏️
                            </button>
                        </div>

                        {/* Search */}
                        <div className="search-section">
                            <SearchBar
                                value={searchQuery}
                                onChange={setSearchQuery}
                                placeholder="Search conversations..."
                                size="small"
                            />
                        </div>

                        {/* Tabs */}
                        <div className="conversation-tabs">
                            <button 
                                className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                                onClick={() => setActiveTab('all')}
                            >
                                All
                            </button>
                            <button 
                                className={`tab-btn ${activeTab === 'unread' ? 'active' : ''}`}
                                onClick={() => setActiveTab('unread')}
                            >
                                Unread
                                {conversations.filter(c => c.unread_count > 0).length > 0 && (
                                    <span className="unread-badge">
                                        {conversations.filter(c => c.unread_count > 0).length}
                                    </span>
                                )}
                            </button>
                            <button 
                                className={`tab-btn ${activeTab === 'archived' ? 'active' : ''}`}
                                onClick={() => setActiveTab('archived')}
                            >
                                Archived
                            </button>
                        </div>

                        {/* Conversations List */}
                        <div className="conversations-list">
                            {filteredConversations.length > 0 ? (
                                filteredConversations.map(conversation => (
                                    <div
                                        key={conversation.id}
                                        className={`conversation-item ${activeConversation?.id === conversation.id ? 'active' : ''}`}
                                        onClick={() => navigate(`/messages/${conversation.id}`)}
                                    >
                                        <div className="conversation-avatar">
                                            {conversation.other_user.avatar ? (
                                                <img src={conversation.other_user.avatar} alt={conversation.other_user.name} />
                                            ) : (
                                                <span className="avatar-initials">
                                                    {conversation.other_user.name.charAt(0)}
                                                </span>
                                            )}
                                            {conversation.other_user.online && (
                                                <div className="online-indicator"></div>
                                            )}
                                        </div>
                                        
                                        <div className="conversation-content">
                                            <div className="conversation-header">
                                                <h4 className="conversation-name">
                                                    {conversation.other_user.name}
                                                </h4>
                                                <span className="conversation-time">
                                                    {formatTime(conversation.last_message_time)}
                                                </span>
                                            </div>
                                            
                                            <div className="conversation-preview">
                                                <p className={`last-message ${conversation.unread_count > 0 ? 'unread' : ''}`}>
                                                    {conversation.last_message}
                                                </p>
                                                {conversation.unread_count > 0 && (
                                                    <span className="unread-count">
                                                        {conversation.unread_count}
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {conversation.context && (
                                                <div className="conversation-context">
                                                    <span className={`context-tag ${conversation.context}`}>
                                                        {conversation.context === 'marketplace' ? '🛒' : '🏠'} 
                                                        {conversation.context}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="conversation-actions">
                                            <button
                                                className="action-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    archiveConversation(conversation.id);
                                                }}
                                                title={conversation.archived ? "Unarchive" : "Archive"}
                                            >
                                                📁
                                            </button>
                                            <button
                                                className="action-btn delete"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteConversation(conversation.id);
                                                }}
                                                title="Delete"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="no-conversations">
                                    <div className="no-conversations-icon">💬</div>
                                    <h3>No conversations</h3>
                                    <p>
                                        {searchQuery ? 'No conversations match your search.' : 
                                         activeTab === 'unread' ? 'No unread messages.' :
                                         activeTab === 'archived' ? 'No archived conversations.' :
                                         'Start a conversation by messaging someone from the marketplace or roommate finder.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </aside>

                    {/* Chat Area */}
                    <main className="chat-area">
                        {activeConversation ? (
                            <>
                                {/* Chat Header */}
                                <div className="chat-header">
                                    <div className="chat-user-info">
                                        <div className="chat-avatar">
                                            {activeConversation.other_user.avatar ? (
                                                <img src={activeConversation.other_user.avatar} alt={activeConversation.other_user.name} />
                                            ) : (
                                                <span className="avatar-initials">
                                                    {activeConversation.other_user.name.charAt(0)}
                                                </span>
                                            )}
                                            {activeConversation.other_user.online && (
                                                <div className="online-indicator"></div>
                                            )}
                                        </div>
                                        <div className="user-details">
                                            <h3>{activeConversation.other_user.name}</h3>
                                            <span className="user-status">
                                                {activeConversation.other_user.online ? 'Online' : 'Offline'}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="chat-actions">
                                        <button className="chat-action-btn" title="Call">
                                            📞
                                        </button>
                                        <button className="chat-action-btn" title="Video Call">
                                            📹
                                        </button>
                                        <button className="chat-action-btn" title="More Options">
                                            ⋮
                                        </button>
                                    </div>
                                </div>

                                {/* Messages */}
                                <div className="messages-area">
                                    <div className="messages-list">
                                        {messages.map(message => (
                                            <div
                                                key={message.id}
                                                className={`message ${message.sender_id === user.id ? 'sent' : 'received'}`}
                                            >
                                                <div className="message-content">
                                                    <p>{message.message}</p>
                                                    <span className="message-time">
                                                        {formatTime(message.created_at)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                        
                                        {sendingMessage && (
                                            <div className="message sent sending">
                                                <div className="message-content">
                                                    <p>{newMessage}</p>
                                                    <span className="sending-indicator">Sending...</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Message Input */}
                                <div className="message-input-area">
                                    <div className="input-wrapper">
                                        <button className="attachment-btn" title="Attach File">
                                            📎
                                        </button>
                                        <textarea
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyPress={handleKeyPress}
                                            placeholder="Type a message..."
                                            rows="1"
                                            disabled={sendingMessage}
                                        />
                                        <button 
                                            className="send-btn"
                                            onClick={sendMessage}
                                            disabled={!newMessage.trim() || sendingMessage}
                                            title="Send Message"
                                        >
                                            {sendingMessage ? '⏳' : '📤'}
                                        </button>
                                    </div>
                                    <div className="input-actions">
                                        <button className="emoji-btn" title="Emoji">
                                            😊
                                        </button>
                                        <span className="typing-indicator">
                                            Press Enter to send, Shift+Enter for new line
                                        </span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="no-conversation-selected">
                                <div className="no-conversation-icon">💬</div>
                                <h3>Select a conversation</h3>
                                <p>Choose a conversation from the sidebar to start messaging</p>
                            </div>
                        )}
                    </main>
                </div>

                {/* Toast Notifications */}
                {toast.show && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={closeToast}
                        position="top-right"
                    />
                )}
            </div>
        </>
    );
}

export default MessagesPage;
