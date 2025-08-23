import React from 'react';
import { Link } from 'react-router-dom';

const Unauthorized = () => {
    return (
        <div className="unauthorized-page">
            <div className="error-container">
                <h1>401</h1>
                <h2>Unauthorized Access</h2>
                <p>You don't have permission to access this page.</p>
                <div className="error-actions">
                    <Link to="/dashboard" className="btn btn-primary">
                        Go to Dashboard
                    </Link>
                    <Link to="/" className="btn btn-secondary">
                        Go Home
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Unauthorized;
