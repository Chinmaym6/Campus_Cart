import { useState, useEffect, useContext, createContext } from 'react';
import { toast } from 'react-toastify';

// Auth Context
const AuthContext = createContext(null);

// Auth Provider Component
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Initialize authentication state
    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const token = localStorage.getItem('accessToken');
                
                if (!token) {
                    setLoading(false);
                    return;
                }

                // Decode JWT to check expiration
                const tokenParts = token.split('.');
                if (tokenParts.length !== 3) {
                    throw new Error('Invalid token format');
                }

                const payload = JSON.parse(atob(tokenParts[1]));
                const currentTime = Date.now() / 1000;

                // Check if token is expired
                if (payload.exp < currentTime) {
                    // Try to refresh token
                    const refreshed = await refreshToken();
                    if (!refreshed) {
                        throw new Error('Token expired');
                    }
                    return;
                }

                // Fetch user data
                const response = await fetch('/api/auth/me', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch user data');
                }

                const userData = await response.json();
                setUser(userData);
                setIsAuthenticated(true);

            } catch (error) {
                console.error('Auth initialization error:', error);
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                setUser(null);
                setIsAuthenticated(false);
            } finally {
                setLoading(false);
            }
        };

        initializeAuth();
    }, []);

    // Login function
    const login = async (email, password) => {
        try {
            setLoading(true);

            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Login failed');
            }

            const data = await response.json();
            
            // Store tokens
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);

            // Set user state
            setUser(data.user);
            setIsAuthenticated(true);

            toast.success(`Welcome back, ${data.user.firstName}!`);
            return data.user;

        } catch (error) {
            console.error('Login error:', error);
            toast.error(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    // Register function
    const register = async (userData) => {
        try {
            setLoading(true);

            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Registration failed');
            }

            const data = await response.json();
            
            toast.success('Account created successfully! Please check your email for verification.');
            return data;

        } catch (error) {
            console.error('Registration error:', error);
            toast.error(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    // Logout function
    const logout = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            
            if (token) {
                // Call logout endpoint
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clear local storage and state regardless of API call result
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            setUser(null);
            setIsAuthenticated(false);
            toast.info('You have been logged out');
        }
    };

    // Refresh token function
    const refreshToken = async () => {
        try {
            const refreshTokenValue = localStorage.getItem('refreshToken');
            
            if (!refreshTokenValue) {
                throw new Error('No refresh token available');
            }

            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken: refreshTokenValue })
            });

            if (!response.ok) {
                throw new Error('Token refresh failed');
            }

            const data = await response.json();
            
            localStorage.setItem('accessToken', data.accessToken);
            
            // If new refresh token is provided
            if (data.refreshToken) {
                localStorage.setItem('refreshToken', data.refreshToken);
            }

            // Update user data if provided
            if (data.user) {
                setUser(data.user);
                setIsAuthenticated(true);
            }

            return true;

        } catch (error) {
            console.error('Token refresh error:', error);
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            setUser(null);
            setIsAuthenticated(false);
            return false;
        }
    };

    // Update user profile
    const updateProfile = async (profileData) => {
        try {
            const token = localStorage.getItem('accessToken');
            
            const response = await fetch('/api/users/profile', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(profileData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Profile update failed');
            }

            const updatedUser = await response.json();
            setUser(updatedUser);
            
            toast.success('Profile updated successfully!');
            return updatedUser;

        } catch (error) {
            console.error('Profile update error:', error);
            toast.error(error.message);
            throw error;
        }
    };

    // Check if user has specific role
    const hasRole = (role) => {
        return user?.role === role;
    };

    // Check if user is verified
    const isVerified = () => {
        return user?.emailVerified === true;
    };

    const value = {
        user,
        loading,
        isAuthenticated,
        login,
        register,
        logout,
        refreshToken,
        updateProfile,
        hasRole,
        isVerified
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// useAuth hook
export const useAuth = () => {
    const context = useContext(AuthContext);
    
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
};

export default useAuth;
