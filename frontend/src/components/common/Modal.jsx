import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import "./Modal.css";

function Modal({ 
    isOpen, 
    onClose, 
    title, 
    children, 
    size = "medium",
    showCloseButton = true,
    closeOnOverlayClick = true,
    customFooter = null
}) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        // Cleanup function
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    useEffect(() => {
        const handleEscapeKey = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscapeKey);
        return () => document.removeEventListener('keydown', handleEscapeKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleOverlayClick = (e) => {
        if (closeOnOverlayClick && e.target === e.currentTarget) {
            onClose();
        }
    };

    const modal = (
        <div className={`modal-overlay ${isOpen ? 'modal-open' : ''}`} onClick={handleOverlayClick}>
            <div className={`modal-container modal-${size}`}>
                {(title || showCloseButton) && (
                    <div className="modal-header">
                        {title && <h2 className="modal-title">{title}</h2>}
                        {showCloseButton && (
                            <button 
                                className="modal-close-button" 
                                onClick={onClose}
                                aria-label="Close modal"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                )}
                
                <div className="modal-body">
                    {children}
                </div>
                
                {customFooter ? (
                    <div className="modal-footer">
                        {customFooter}
                    </div>
                ) : (
                    showCloseButton && (
                        <div className="modal-footer">
                            <button className="modal-btn secondary" onClick={onClose}>
                                Close
                            </button>
                        </div>
                    )
                )}
            </div>
        </div>
    );

    return ReactDOM.createPortal(modal, document.body);
}

export default Modal;
