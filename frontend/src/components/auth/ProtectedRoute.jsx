import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, requiredRole = null, redirectTo = '/login' }) => {
    const { isAuthenticated, user, loading, hasRole } = useAuth();
    const location = useLocation();

    // Show loading spinner while checking authentication
    if (loading) {
        return (
            <div className="route-loading">
                <div className="loading-spinner"></div>
                <p>Authenticating...</p>
            </div>
        );
    }

    // If not authenticated, redirect to login with return URL
    if (!isAuthenticated) {
        return (
            <Navigate 
                to={redirectTo} 
                state={{ from: location }} 
                replace 
            />
        );
    }

    // Check role-based access if required
    if (requiredRole && !hasRole(requiredRole)) {
        return (
            <Navigate 
                to="/unauthorized" 
                state={{ from: location }} 
                replace 
            />
        );
    }

    // If authenticated and authorized, render the protected content
    return children;
};

export default ProtectedRoute;
