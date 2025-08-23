import React from 'react';
import { FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
import './ErrorFallback.css';

const ErrorFallback = ({ error, resetErrorBoundary }) => {
    return (
        <div className="error-fallback">
            <div className="error-fallback-content">
                <div className="error-icon">
                    <FiAlertCircle />
                </div>
                <h2>Oops! Something went wrong</h2>
                <p className="error-description">
                    We encountered an unexpected error. Don't worry, this has been reported to our team.
                </p>
                <details className="error-details">
                    <summary>Error Details</summary>
                    <pre className="error-message">{error.message}</pre>
                </details>
                <div className="error-actions">
                    <button onClick={resetErrorBoundary} className="retry-button">
                        <FiRefreshCw />
                        Try Again
                    </button>
                    <button onClick={() => window.location.href = '/'} className="home-button">
                        Go Home
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ErrorFallback;
