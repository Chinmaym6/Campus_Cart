import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const PublicRoute = ({ children, redirectTo = '/dashboard' }) => {
    const { isAuthenticated, loading } = useAuth();

    // Show loading spinner while checking authentication
    if (loading) {
        return (
            <div className="route-loading">
                <div className="loading-spinner"></div>
                <p>Loading...</p>
            </div>
        );
    }

    // If user is authenticated, redirect them to dashboard
    if (isAuthenticated) {
        return <Navigate to={redirectTo} replace />;
    }

    // If not authenticated, render the public page
    return children;
};

export default PublicRoute;
