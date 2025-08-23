import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import "./Toast.css";

function Toast({ 
    message, 
    type = "info", 
    duration = 5000, 
    position = "top-right",
    onClose,
    showCloseButton = true,
    autoClose = true
}) {
    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        if (message) {
            setIsVisible(true);
            
            if (autoClose && duration > 0) {
                const timer = setTimeout(() => {
                    handleClose();
                }, duration);
                
                return () => clearTimeout(timer);
            }
        }
    }, [message, duration, autoClose]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => {
            setIsVisible(false);
            if (onClose) {
                onClose();
            }
        }, 300);
    };

    if (!message || !isVisible) return null;

    const getIcon = () => {
        switch (type) {
            case 'success':
                return '✅';
            case 'error':
                return '❌';
            case 'warning':
                return '⚠️';
            case 'info':
            default:
                return 'ℹ️';
        }
    };

    const toast = (
        <div className={`toast-container ${type} ${position} ${isExiting ? 'exiting' : ''}`}>
            <div className="toast-content">
                <span className="toast-icon">{getIcon()}</span>
                <span className="toast-message">{message}</span>
                {showCloseButton && (
                    <button className="toast-close" onClick={handleClose}>
                        ✕
                    </button>
                )}
            </div>
            {autoClose && duration > 0 && (
                <div 
                    className="toast-progress" 
                    style={{ animationDuration: `${duration}ms` }}
                />
            )}
        </div>
    );

    return ReactDOM.createPortal(toast, document.body);
}

// Toast Manager for multiple toasts
export class ToastManager {
    static toasts = [];
    static listeners = [];

    static show(message, type = 'info', options = {}) {
        const id = Date.now() + Math.random();
        const toast = {
            id,
            message,
            type,
            ...options
        };
        
        this.toasts.push(toast);
        this.notify();
        
        return id;
    }

    static success(message, options = {}) {
        return this.show(message, 'success', options);
    }

    static error(message, options = {}) {
        return this.show(message, 'error', { duration: 7000, ...options });
    }

    static warning(message, options = {}) {
        return this.show(message, 'warning', options);
    }

    static info(message, options = {}) {
        return this.show(message, 'info', options);
    }

    static remove(id) {
        this.toasts = this.toasts.filter(toast => toast.id !== id);
        this.notify();
    }

    static subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(listener => listener !== callback);
        };
    }

    static notify() {
        this.listeners.forEach(listener => listener(this.toasts));
    }
}

export default Toast;
