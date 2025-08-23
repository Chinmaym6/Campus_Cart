import React, { useState, useRef, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FiSend, FiPaperclip, FiSmile, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import './MessageInput.css';

const MessageInput = ({
    onSendMessage,
    onTypingStart,
    onTypingStop,
    disabled = false,
    placeholder = "Type a message...",
    maxLength = 2000,
    allowAttachments = true,
    allowEmojis = true
}) => {
    const [message, setMessage] = useState('');
    const [attachments, setAttachments] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    // Auto-resize textarea
    const adjustTextareaHeight = useCallback(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
        }
    }, []);

    // Handle text change
    const handleTextChange = (e) => {
        const value = e.target.value;
        setMessage(value);
        adjustTextareaHeight();

        // Handle typing indicators
        if (value.length > 0 && !isTyping) {
            setIsTyping(true);
            onTypingStart?.();
        }

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Set new timeout
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            onTypingStop?.();
        }, 1000);
    };

    // Handle file attachment
    const handleFileAttach = (e) => {
        const files = Array.from(e.target.files);
        
        if (files.length === 0) return;

        // Validate files
        const validFiles = files.filter(file => {
            // Check file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                toast.error(`${file.name} is too large. Maximum size is 10MB.`);
                return false;
            }

            // Check file type
            const allowedTypes = [
                'image/jpeg', 'image/png', 'image/gif', 'image/webp',
                'application/pdf', 'text/plain', 'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ];

            if (!allowedTypes.includes(file.type)) {
                toast.error(`${file.name} is not a supported file type.`);
                return false;
            }

            return true;
        });

        // Add to attachments
        const newAttachments = validFiles.map(file => ({
            id: Date.now() + Math.random(),
            file,
            name: file.name,
            size: file.size,
            type: file.type.startsWith('image/') ? 'image' : 'file',
            preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
        }));

        setAttachments(prev => [...prev, ...newAttachments]);
        
        // Clear file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Remove attachment
    const removeAttachment = (attachmentId) => {
        setAttachments(prev => {
            const updated = prev.filter(att => att.id !== attachmentId);
            // Revoke object URLs to prevent memory leaks
            const removed = prev.find(att => att.id === attachmentId);
            if (removed?.preview) {
                URL.revokeObjectURL(removed.preview);
            }
            return updated;
        });
    };

    // Handle form submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (disabled) return;
        
        const trimmedMessage = message.trim();
        
        if (!trimmedMessage && attachments.length === 0) {
            return;
        }

        try {
            // Prepare attachments for upload
            const attachmentData = attachments.map(att => ({
                file: att.file,
                type: att.type,
                name: att.name
            }));

            // Send message
            await onSendMessage(trimmedMessage, attachmentData);
            
            // Clear form
            setMessage('');
            setAttachments([]);
            adjustTextareaHeight();
            
            // Stop typing indicator
            if (isTyping) {
                setIsTyping(false);
                onTypingStop?.();
            }

            // Clear typing timeout
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            // Focus back to input
            textareaRef.current?.focus();

        } catch (error) {
            console.error('Failed to send message:', error);
            toast.error('Failed to send message. Please try again.');
        }
    };

    // Handle keyboard shortcuts
    const handleKeyDown = (e) => {
        // Send on Enter (not Shift+Enter)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
        
        // Emoji picker toggle
        if (e.key === ':' && e.ctrlKey) {
            e.preventDefault();
            setShowEmojiPicker(!showEmojiPicker);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            
            // Revoke object URLs
            attachments.forEach(att => {
                if (att.preview) {
                    URL.revokeObjectURL(att.preview);
                }
            });
        };
    }, [attachments]);

    // Format file size
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="message-input-container">
            {/* Attachments Preview */}
            {attachments.length > 0 && (
                <div className="attachments-preview">
                    {attachments.map((attachment) => (
                        <div key={attachment.id} className="attachment-preview">
                            {attachment.type === 'image' ? (
                                <div className="attachment-image-preview">
                                    <img
                                        src={attachment.preview}
                                        alt={attachment.name}
                                        className="preview-img"
                                    />
                                    <button
                                        type="button"
                                        className="remove-attachment"
                                        onClick={() => removeAttachment(attachment.id)}
                                    >
                                        <FiX />
                                    </button>
                                </div>
                            ) : (
                                <div className="attachment-file-preview">
                                    <div className="file-info">
                                        <span className="file-name">{attachment.name}</span>
                                        <span className="file-size">{formatFileSize(attachment.size)}</span>
                                    </div>
                                    <button
                                        type="button"
                                        className="remove-attachment"
                                        onClick={() => removeAttachment(attachment.id)}
                                    >
                                        <FiX />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Input Form */}
            <form className="message-input-form" onSubmit={handleSubmit}>
                <div className="input-wrapper">
                    {/* Attachment Button */}
                    {allowAttachments && (
                        <button
                            type="button"
                            className="attach-btn"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={disabled}
                            title="Attach file"
                        >
                            <FiPaperclip />
                        </button>
                    )}

                    {/* Text Input */}
                    <div className="text-input-wrapper">
                        <textarea
                            ref={textareaRef}
                            value={message}
                            onChange={handleTextChange}
                            onKeyDown={handleKeyDown}
                            placeholder={placeholder}
                            disabled={disabled}
                            maxLength={maxLength}
                            rows={1}
                            className="message-textarea"
                        />
                        
                        {/* Character count */}
                        {message.length > maxLength * 0.8 && (
                            <div className="character-count">
                                {message.length}/{maxLength}
                            </div>
                        )}
                    </div>

                    {/* Emoji Button */}
                    {allowEmojis && (
                        <button
                            type="button"
                            className="emoji-btn"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            disabled={disabled}
                            title="Add emoji"
                        >
                            <FiSmile />
                        </button>
                    )}

                    {/* Send Button */}
                    <button
                        type="submit"
                        className="send-btn"
                        disabled={disabled || (!message.trim() && attachments.length === 0)}
                        title="Send message"
                    >
                        <FiSend />
                    </button>
                </div>

                {/* Hidden File Input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    onChange={handleFileAttach}
                    style={{ display: 'none' }}
                />
            </form>

            {/* Helper Text */}
            <div className="input-help-text">
                Press Enter to send, Shift+Enter for new line
            </div>
        </div>
    );
};

MessageInput.propTypes = {
    onSendMessage: PropTypes.func.isRequired,
    onTypingStart: PropTypes.func,
    onTypingStop: PropTypes.func,
    disabled: PropTypes.bool,
    placeholder: PropTypes.string,
    maxLength: PropTypes.number,
    allowAttachments: PropTypes.bool,
    allowEmojis: PropTypes.bool
};

export default MessageInput;
