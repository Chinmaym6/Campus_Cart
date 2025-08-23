import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import api from '../utils/api';
import { toast } from 'react-toastify';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Axios is already configured in api.js

    // Add axios interceptors for token handling
    useEffect(() => {
        // Request interceptor to add token to headers
        const requestInterceptor = axios.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem('accessToken');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        // Response interceptor for token refresh and error handling
        const responseInterceptor = axios.interceptors.response.use(
            (response) => response,
            async (error) => {
                const original = error.config;

                if (error.response?.status === 401 && !original._retry) {
                    original._retry = true;

                    try {
                        const refreshToken = localStorage.getItem('refreshToken');
                        if (refreshToken) {
                            const response = await api.post('/refresh', {
                                refreshToken
                            });
                            
                            const { accessToken } = response.data;
                            localStorage.setItem('accessToken', accessToken);
                            
                            return api(original);
                        }
                    } catch (refreshError) {
                        // Refresh failed, logout user
                        logout();
                        return Promise.reject(refreshError);
                    }
                }

                return Promise.reject(error);
            }
        );

        // Cleanup interceptors
        return () => {
            axios.interceptors.request.eject(requestInterceptor);
            axios.interceptors.response.eject(responseInterceptor);
        };
    }, []);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            setLoading(true);
            
            // Check for stored token first
            const token = localStorage.getItem('accessToken');
            const storedUser = localStorage.getItem('user');
            
            if (!token) {
                if (storedUser) {
                    localStorage.removeItem('user');
                }
                setUser(null);
                setIsAuthenticated(false);
                return;
            }

            // Validate token with server
            const response = await api.get('/api/auth/me');
            
            if (response.data && response.data.user) {
                setUser(response.data.user);
                setIsAuthenticated(true);
                
                // Update stored user data
                localStorage.setItem('user', JSON.stringify(response.data.user));
            } else {
                throw new Error('Invalid user data received');
            }
            
        } catch (error) {
            console.error('Auth check failed:', error);
            
            // Clear invalid tokens and user data
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            
            setUser(null);
            setIsAuthenticated(false);
            
            // Only show error if it's not a 401 (unauthorized)
            if (error.response?.status !== 401) {
                toast.error('Session expired. Please login again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const login = async (credentials) => {
        try {
            setLoading(true);
            
            const response = await api.post('/api/auth/login', credentials);
            
            if (response.data && response.data.user) {
                const { user: userData, accessToken, refreshToken } = response.data;
                
                // Store tokens
                if (accessToken) {
                    localStorage.setItem('accessToken', accessToken);
                }
                if (refreshToken) {
                    localStorage.setItem('refreshToken', refreshToken);
                }
                
                // Store user data
                localStorage.setItem('user', JSON.stringify(userData));
                
                // Update state
                setUser(userData);
                setIsAuthenticated(true);
                
                // Show success message
                toast.success(`Welcome back, ${userData.firstName || userData.name || 'User'}!`);
                
                return response.data;
            } else {
                throw new Error('Invalid login response');
            }
            
        } catch (error) {
            console.error('Login error:', error);
            
            // Extract error message
            const errorMessage = error.response?.data?.message || 
                               error.response?.data?.error || 
                               error.message || 
                               'Login failed. Please try again.';
            
            toast.error(errorMessage);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const register = async (userData) => {
        try {
            setLoading(true);
            
            const response = await api.post('/api/auth/register', userData);
            
            if (response.data) {
                toast.success('Registration successful! Please check your email for verification.');
                return response.data;
            }
            
        } catch (error) {
            console.error('Registration error:', error);
            
            const errorMessage = error.response?.data?.message || 
                               error.response?.data?.error || 
                               error.message || 
                               'Registration failed. Please try again.';
            
            toast.error(errorMessage);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            // Try to logout from server
            const token = localStorage.getItem('accessToken');
            if (token) {
                await api.post('/api/auth/logout');
            }
        } catch (error) {
            console.error('Logout error:', error);
            // Continue with local logout even if server logout fails
        } finally {
            // Clear all stored data
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            
            // Update state
            setUser(null);
            setIsAuthenticated(false);
            
            // Show logout message
            toast.info('You have been logged out successfully.');
        }
    };

    const updateProfile = async (profileData) => {
        try {
            setLoading(true);
            
            const response = await api.put('/api/auth/profile', profileData);
            
            if (response.data && response.data.user) {
                const updatedUser = response.data.user;
                
                // Update state and localStorage
                setUser(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
                
                toast.success('Profile updated successfully!');
                return updatedUser;
            }
            
        } catch (error) {
            console.error('Profile update error:', error);
            
            const errorMessage = error.response?.data?.message || 
                               'Failed to update profile. Please try again.';
            
            toast.error(errorMessage);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const changePassword = async (passwordData) => {
        try {
            setLoading(true);
            
            const response = await axios.put('/api/auth/change-password', passwordData);
            
            toast.success('Password changed successfully!');
            return response.data;
            
        } catch (error) {
            console.error('Password change error:', error);
            
            const errorMessage = error.response?.data?.message || 
                               'Failed to change password. Please try again.';
            
            toast.error(errorMessage);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const forgotPassword = async (email) => {
        try {
            setLoading(true);
            
            const response = await axios.post('/api/auth/forgot-password', { email });
            
            toast.success('Password reset link sent to your email!');
            return response.data;
            
        } catch (error) {
            console.error('Forgot password error:', error);
            
            const errorMessage = error.response?.data?.message || 
                               'Failed to send reset email. Please try again.';
            
            toast.error(errorMessage);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const resetPassword = async (token, newPassword) => {
        try {
            setLoading(true);
            
            const response = await axios.post('/api/auth/reset-password', {
                token,
                newPassword
            });
            
            toast.success('Password reset successful! You can now login with your new password.');
            return response.data;
            
        } catch (error) {
            console.error('Reset password error:', error);
            
            const errorMessage = error.response?.data?.message || 
                               'Failed to reset password. Please try again.';
            
            toast.error(errorMessage);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const verifyEmail = async (token) => {
        try {
            setLoading(true);
            
            const response = await axios.post('/api/auth/verify-email', { token });
            
            // Update user if verification successful
            if (response.data && response.data.user) {
                setUser(response.data.user);
                localStorage.setItem('user', JSON.stringify(response.data.user));
            }
            
            toast.success('Email verified successfully!');
            return response.data;
            
        } catch (error) {
            console.error('Email verification error:', error);
            
            const errorMessage = error.response?.data?.message || 
                               'Email verification failed. Please try again.';
            
            toast.error(errorMessage);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    // Check if user has specific role (enhanced from your original)
    const hasRole = (role) => {
        return user?.role === role;
    };

    // Check if user has any of the specified roles
    const hasAnyRole = (roles) => {
        return roles.includes(user?.role);
    };

    // Check if user is verified
    const isVerified = () => {
        return user?.emailVerified === true || user?.verified === true;
    };

    // Update user data without API call (for real-time updates)
    const updateUser = (updatedData) => {
        setUser(prevUser => {
            const newUser = { ...prevUser, ...updatedData };
            localStorage.setItem('user', JSON.stringify(newUser));
            return newUser;
        });
    };

    const value = {
        // State
        user,
        loading,
        isAuthenticated,
        
        // Core auth functions (preserving your original)
        login,
        logout,
        checkAuth,
        
        // Enhanced auth functions
        register,
        updateProfile,
        changePassword,
        forgotPassword,
        resetPassword,
        verifyEmail,
        updateUser,
        
        // Utility functions
        hasRole,
        hasAnyRole,
        isVerified
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
