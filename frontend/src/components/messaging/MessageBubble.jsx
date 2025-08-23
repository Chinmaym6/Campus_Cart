import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { formatDistanceToNow, format } from 'date-fns';
import { FiCheck, FiCheckCircle, FiClock, FiAlertCircle } from 'react-icons/fi';
import './MessageBubble.css';

const MessageBubble = ({
    message,
    isOwn,
    showAvatar = false,
    senderAvatar = null,
    showTimestamp = false
}) => {
    const [showFullTimestamp, setShowFullTimestamp] = useState(false);

    // Format timestamp
    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        
        if (showFullTimestamp) {
            return format(date, 'MMM d, yyyy \'at\' h:mm a');
        }
        
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);
        
        if (diffInHours < 1) {
            return format(date, 'h:mm a');
        } else if (diffInHours < 24) {
            return formatDistanceToNow(date, { addSuffix: true });
        } else {
            return format(date, 'MMM d \'at\' h:mm a');
        }
    };

    // Get message status icon
    const getStatusIcon = () => {
        if (!isOwn) return null;

        switch (message.status) {
            case 'sending':
                return <FiClock className="status-icon sending" />;
            case 'sent':
                return <FiCheck className="status-icon sent" />;
            case 'delivered':
                return <FiCheckCircle className="status-icon delivered" />;
            case 'read':
                return <FiCheckCircle className="status-icon read" />;
            case 'failed':
                return <FiAlertCircle className="status-icon failed" />;
            default:
                return <FiCheck className="status-icon sent" />;
        }
    };

    // Handle message click for timestamp
    const handleMessageClick = () => {
        setShowFullTimestamp(!showFullTimestamp);
    };

    // Render message attachments
    const renderAttachments = () => {
        if (!message.attachments || message.attachments.length === 0) return null;

        return (
            <div className="message-attachments">
                {message.attachments.map((attachment, index) => {
                    if (attachment.type === 'image') {
                        return (
                            <div key={index} className="attachment-image">
                                <img
                                    src={attachment.url}
                                    alt="Attachment"
                                    className="attachment-img"
                                    onClick={() => {
                                        // Open image in full screen or modal
                                        window.open(attachment.url, '_blank');
                                    }}
                                />
                            </div>
                        );
                    } else if (attachment.type === 'file') {
                        return (
                            <div key={index} className="attachment-file">
                                <a
                                    href={attachment.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="file-link"
                                >
                                    📎 {attachment.name}
                                </a>
                            </div>
                        );
                    }
                    return null;
                })}
            </div>
        );
    };

    // Render system message
    if (message.type === 'system') {
        return (
            <div className="message-bubble system">
                <div className="system-message">
                    {message.content}
                </div>
                <div className="message-timestamp">
                    {formatTimestamp(message.createdAt)}
                </div>
            </div>
        );
    }

    return (
        <div className={`message-bubble-container ${isOwn ? 'own' : 'other'}`}>
            {/* Avatar for other users */}
            {showAvatar && !isOwn && (
                <div className="message-avatar">
                    <img
                        src={senderAvatar || '/default-avatar.png'}
                        alt="Avatar"
                        className="avatar-img"
                    />
                </div>
            )}

            <div className="message-bubble-wrapper">
                <div 
                    className={`message-bubble ${isOwn ? 'own' : 'other'} ${message.status || ''}`}
                    onClick={handleMessageClick}
                >
                    {/* Message Content */}
                    {message.content && (
                        <div className="message-content">
                            {message.content}
                        </div>
                    )}

                    {/* Attachments */}
                    {renderAttachments()}

                    {/* Message Meta */}
                    <div className="message-meta">
                        <span className="message-time">
                            {formatTimestamp(message.createdAt)}
                        </span>
                        {getStatusIcon()}
                    </div>
                </div>

                {/* Extended timestamp on click */}
                {showFullTimestamp && (
                    <div className="extended-timestamp">
                        {format(new Date(message.createdAt), 'EEEE, MMMM d, yyyy \'at\' h:mm:ss a')}
                    </div>
                )}
            </div>
        </div>
    );
};

MessageBubble.propTypes = {
    message: PropTypes.shape({
        id: PropTypes.string.isRequired,
        content: PropTypes.string,
        createdAt: PropTypes.string.isRequired,
        senderId: PropTypes.string.isRequired,
        status: PropTypes.oneOf(['sending', 'sent', 'delivered', 'read', 'failed']),
        type: PropTypes.oneOf(['text', 'image', 'file', 'system']),
        attachments: PropTypes.array
    }).isRequired,
    isOwn: PropTypes.bool.isRequired,
    showAvatar: PropTypes.bool,
    senderAvatar: PropTypes.string,
    showTimestamp: PropTypes.bool
};

export default MessageBubble;
