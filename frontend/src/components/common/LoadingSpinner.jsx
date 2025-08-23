import React from "react";
import "./LoadingSpinner.css";

function LoadingSpinner({ 
    size = "medium", 
    type = "default", 
    message = "", 
    overlay = false 
}) {
    const sizeClass = `spinner-${size}`;
    const typeClass = `spinner-${type}`;
    
    const spinner = (
        <div className={`loading-spinner ${sizeClass} ${typeClass}`}>
            <div className="spinner-inner">
                <div className="spinner-circle"></div>
                <div className="spinner-circle"></div>
                <div className="spinner-circle"></div>
                <div className="spinner-circle"></div>
            </div>
            {message && <p className="spinner-message">{message}</p>}
        </div>
    );

    if (overlay) {
        return (
            <div className="spinner-overlay">
                {spinner}
            </div>
        );
    }

    return (
        <div className="spinner-container">
            {spinner}
        </div>
    );
}

export default LoadingSpinner;
