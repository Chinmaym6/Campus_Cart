import React, { useEffect, useState, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ErrorBoundary } from 'react-error-boundary';

// Styles and Toast CSS
import './App.css';
import 'react-toastify/dist/ReactToastify.css';

// Context Providers
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';

// Layout Components
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorFallback from './components/common/ErrorFallback';
import BackToTop from './components/common/BackToTop';

// Route Protection Components
import ProtectedRoute from './components/auth/ProtectedRoute';
import PublicRoute from './components/auth/PublicRoute';

// Auth Pages
import Landing from './pages/auth/landingpage';
import Login from './pages/auth/login';
import Register from './pages/auth/register';
import ForgotPassword from './pages/auth/forgot-password';
import ResetPassword from './components/auth/ResetPassword';
import EmailVerification from './components/auth/EmailVerification';

// Main Application Pages
import Dashboard from './pages/dashboard/Dashboard';
import Profile from './pages/profile/index.jsx';
import SettingsPage from './pages/profile/settings';
import ListingsPages from './pages/profile/listings';
import PurchasesPage from './pages/profile/purchases';
import SalesHistory from './pages/profile/SalesHistory';
import SavedItemsPage from './pages/profile/saved';


// Marketplace Pages
import MarketplaceHome from './pages/marketplace/index';
import ItemDetails from './pages/marketplace/item/[id]';
import ItemCreate from './pages/marketplace/create';
import ItemEdit from './pages/marketplace/edit/[id]';
import Categories from './pages/marketplace/[category]';

// User Management Pages

// Admin Pages
import AdminDashboard from './pages/admin/index';
import AdminAnalytics from './pages/admin/analytics';
import AdminUsers from './pages/admin/users';
import AdminReports from './pages/admin/reports';

// Messaging Pages
import MessagesPage from './pages/messages/index';
import ChatPage from './pages/messages/[chatId]';

// Roommate Pages
// Roommate Pages - Complete corrected imports
import RoommateHome from './pages/roommates/index';
import RoommateCreate from './pages/roommates/create';
import RoommateDetails from './pages/roommates/profile/[id]';
import CompatibilityQuiz from './pages/roommates/compatibility';
import RoommateMatches from './pages/roommates/matches';

// Missing components - create these files:
import RoommateEdit from './pages/roommates/RoommateEdit';
import MyRoommatePost from './pages/roommates/MyRoommatePost';


// Review & Rating Pages
import Reviews from './components/profile/Reviews';

// Help & Support Pages
import Help from './pages/help/index';
import Contact from './pages/help/contact';

// Error Pages
import Unauthorized from './pages/errors/Unauthorized';

// Create React Query client with optimized configuration
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: (failureCount, error) => {
                // Don't retry on 401 (unauthorized) errors
                if (error?.response?.status === 401) return false;
                return failureCount < 2;
            },
            staleTime: 5 * 60 * 1000, // 5 minutes
            cacheTime: 10 * 60 * 1000, // 10 minutes
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
        },
        mutations: {
            retry: false,
        },
    },
});

// App Layout Component
const AppLayout = ({ children, showNavbar = true, showFooter = true }) => {
    return (
        <div className="app-container">
            {showNavbar && <Navbar />}
            <main className={`main-content ${showNavbar ? 'with-navbar' : 'full-height'}`}>
                {children}
            </main>
            {showFooter && <Footer />}
            <BackToTop />
        </div>
    );
};

// Route Wrapper Components
const PublicRouteWrapper = ({ children, redirectTo = "/dashboard" }) => {
    return (
        <PublicRoute redirectTo={redirectTo}>
            <AppLayout showNavbar={false} showFooter={false}>
                {children}
            </AppLayout>
        </PublicRoute>
    );
};

const ProtectedRouteWrapper = ({ children, requiredRole = null }) => {
    return (
        <ProtectedRoute requiredRole={requiredRole}>
            <AppLayout>
                {children}
            </AppLayout>
        </ProtectedRoute>
    );
};

const AdminRouteWrapper = ({ children }) => {
    return (
        <ProtectedRoute requiredRole="admin">
            <AppLayout>
                {children}
            </AppLayout>
        </ProtectedRoute>
    );
};

// App Initialization Component
const AppInitializer = ({ children }) => {
    const [isInitialized, setIsInitialized] = useState(false);
    const [initError, setInitError] = useState(null);

    useEffect(() => {
        const initializeApp = async () => {
            try {
                // Simulate app initialization (you can add real initialization logic here)
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Check if user has a stored session
                const token = localStorage.getItem('accessToken');
                if (token) {
                    // You could validate the token here
                    console.log('User session found');
                }

                setIsInitialized(true);
            } catch (error) {
                console.error('App initialization error:', error);
                setInitError(error.message);
                setIsInitialized(true); // Continue even if initialization fails
            }
        };

        initializeApp();
    }, []);

    if (!isInitialized) {
        return (
            <div className="app-loading">
                <LoadingSpinner size="large" />
                <h2>Loading Campus Cart...</h2>
                <p>Setting up your marketplace experience</p>
            </div>
        );
    }

    if (initError) {
        return (
            <div className="app-error">
                <h2>Initialization Error</h2>
                <p>{initError}</p>
                <button onClick={() => window.location.reload()}>
                    Retry
                </button>
            </div>
        );
    }

    return children;
};

// Main App Component
function App() {
    // Global error handler
    const handleGlobalError = (error, errorInfo) => {
        console.error('Global error:', error, errorInfo);
        // You could send this to an error reporting service
    };

    return (
        <ErrorBoundary FallbackComponent={ErrorFallback} onError={handleGlobalError}>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider>
                    <AuthProvider>
                        <Router>
                            <SocketProvider>
                                <NotificationProvider>
                                    <AppInitializer>
                                        <div className="App">
                                            <Suspense fallback={<LoadingSpinner size="large" />}>
                                                <Routes>
                                                    {/* Public Routes (Authentication) */}
                                                    <Route 
                                                        path="/" 
                                                        element={
                                                            <PublicRouteWrapper>
                                                                <Landing />
                                                            </PublicRouteWrapper>
                                                        } 
                                                    />
                                                    <Route 
                                                        path="/login" 
                                                        element={
                                                            <PublicRouteWrapper>
                                                                <Login />
                                                            </PublicRouteWrapper>
                                                        } 
                                                    />
                                                    <Route 
                                                        path="/register" 
                                                        element={
                                                            <PublicRouteWrapper>
                                                                <Register />
                                                            </PublicRouteWrapper>
                                                        } 
                                                    />
                                                    <Route 
                                                        path="/forgot-password" 
                                                        element={
                                                            <PublicRouteWrapper>
                                                                <ForgotPassword />
                                                            </PublicRouteWrapper>
                                                        } 
                                                    />
                                                    <Route 
                                                        path="/reset-password/:token" 
                                                        element={
                                                            <PublicRouteWrapper>
                                                                <ResetPassword />
                                                            </PublicRouteWrapper>
                                                        } 
                                                    />
                                                    <Route 
                                                        path="/verify-email/:token" 
                                                        element={
                                                            <PublicRouteWrapper>
                                                                <EmailVerification />
                                                            </PublicRouteWrapper>
                                                        } 
                                                    />

                                                    {/* Protected Routes - Dashboard & Profile */}
                                                    <Route 
                                                        path="/dashboard" 
                                                        element={
                                                            <ProtectedRouteWrapper>
                                                                <Dashboard />
                                                            </ProtectedRouteWrapper>
                                                        } 
                                                    />
                                                    <Route 
                                                        path="/profile" 
                                                        element={
                                                            <ProtectedRouteWrapper>
                                                                <Profile />
                                                            </ProtectedRouteWrapper>
                                                        } 
                                                    />
                                                    <Route 
                                                        path="/profile/:userId" 
                                                        element={
                                                            <ProtectedRouteWrapper>
                                                                <Profile />
                                                            </ProtectedRouteWrapper>
                                                        } 
                                                    />
                                                    <Route 
                                                        path="/settings" 
                                                        element={
                                                            <ProtectedRouteWrapper>
                                                                <SettingsPage />
                                                            </ProtectedRouteWrapper>
                                                        } 
                                                    />

                                                    {/* Marketplace Routes */}
                                                    <Route 
                                                        path="/marketplace" 
                                                        element={
                                                            <ProtectedRouteWrapper>
                                                                <MarketplaceHome />
                                                            </ProtectedRouteWrapper>
                                                        } 
                                                    />
                                                    <Route 
                                                        path="/marketplace/search" 
                                                        element={
                                                            <ProtectedRouteWrapper>
                                                                <MarketplaceHome />
                                                            </ProtectedRouteWrapper>
                                                        } 
                                                    />
                                                    <Route 
                                                        path="/marketplace/categories" 
                                                        element={
                                                            <ProtectedRouteWrapper>
                                                                <Categories />
                                                            </ProtectedRouteWrapper>
                                                        } 
                                                    />
                                                    <Route 
                                                        path="/marketplace/categories/:categorySlug" 
                                                        element={
                                                            <ProtectedRouteWrapper>
                                                                <Categories />
                                                            </ProtectedRouteWrapper>
                                                        } 
                                                    />
                                                    <Route 
                                                        path="/items/create" 
                                                        element={
                                                            <ProtectedRouteWrapper>
                                                                <ItemCreate />
                                                            </ProtectedRouteWrapper>
                                                        } 
                                                    />
                                                    <Route 
                                                        path="/items/:itemId" 
                                                        element={
                                                            <ProtectedRouteWrapper>
                                                                <ItemDetails />
                                                            </ProtectedRouteWrapper>
                                                        } 
                                                    />
                                                    <Route 
                                                        path="/items/:itemId/edit" 
                                                        element={
                                                            <ProtectedRouteWrapper>
                                                                <ItemEdit />
                                                            </ProtectedRouteWrapper>
                                                        } 
                                                    />
                                                    <Route 
                                                        path="/saved-items" 
                                                        element={
                                                            <ProtectedRouteWrapper>
                                                                <SavedItemsPage />
                                                            </ProtectedRouteWrapper>
                                                        } 
                                                    />

                                                    {/* Listings Management Routes */}
                                                    <Route 
                                                        path="/my-listings" 
                                                        element={
                                                            <ProtectedRouteWrapper>
                                                                <ListingsPages />
                                                            </ProtectedRouteWrapper>
                                                        } 
                                                    />
                                                    <Route 
                                                        path="/purchase-history" 
                                                        element={
                                                            <ProtectedRouteWrapper>
                                                                <PurchasesPage />
                                                            </ProtectedRouteWrapper>
                                                        } 
                                                    />
                                                    <Route 
                                                        path="/sales-history" 
                                                        element={
                                                            <ProtectedRouteWrapper>
                                                                <SalesHistory />
                                                            </ProtectedRouteWrapper>
                                                        } 
                                                    />

                                                    {/* Messaging Routes */}
                                                    <Route 
                                                        path="/messages" 
                                                        element={
                                                            <ProtectedRouteWrapper>
                                                                <MessagesPage />
                                                            </ProtectedRouteWrapper>
                                                        } 
                                                    />
                                                    <Route 
                                                        path="/messages/:conversationId" 
                                                        element={
                                                            <ProtectedRouteWrapper>
                                                                <ChatPage />
                                                            </ProtectedRouteWrapper>
                                                        } 
                                                    />

                                                    {/* Roommate Routes */}
                                                    <Route 
                                                        path="/roommates" 
                                                        element={
                                                            <ProtectedRouteWrapper>
                                                                <RoommateHome />
                                                            </ProtectedRouteWrapper>
                                                        } 
                                                    />
                                                    <Route 
                                                        path="/roommates/create" 
                                                        element={
                                                            <ProtectedRouteWrapper>
                                                                <RoommateCreate />
                                                            </ProtectedRouteWrapper>
                                                        } 
                                                    />
                                                    <Route 
                                                        path="/roommates/:postId" 
                                                        element={
                                                            <ProtectedRouteWrapper>
                                                                <RoommateDetails />
                                                            </ProtectedRouteWrapper>
                                                        } 
                                                    />
                                                    <Route 
                                                        path="/roommates/:postId/edit" 
                                                        element={
                                                            <ProtectedRouteWrapper>
                                                                <RoommateEdit />
                                                            </ProtectedRouteWrapper>
                                                        } 
                                                    />
                                                    <Route 
                                                        path="/my-roommate-post" 
                                                        element={
                                                            <ProtectedRouteWrapper>
                                                                <MyRoommatePost />
                                                            </ProtectedRouteWrapper>
                                                        } 
                                                    />

                                                    {/* Reviews Routes */}
                                                    <Route 
                                                        path="/reviews" 
                                                        element={
                                                            <ProtectedRouteWrapper>
                                                                <Reviews />
                                                            </ProtectedRouteWrapper>
                                                        } 
                                                    />

                                                    {/* Admin Routes */}
                                                    <Route 
                                                        path="/admin" 
                                                        element={
                                                            <AdminRouteWrapper>
                                                                <AdminDashboard />
                                                            </AdminRouteWrapper>
                                                        } 
                                                    />
                                                    <Route 
                                                        path="/admin/analytics" 
                                                        element={
                                                            <AdminRouteWrapper>
                                                                <AdminAnalytics />
                                                            </AdminRouteWrapper>
                                                        } 
                                                    />
                                                    <Route 
                                                        path="/admin/users" 
                                                        element={
                                                            <AdminRouteWrapper>
                                                                <AdminUsers />
                                                            </AdminRouteWrapper>
                                                        } 
                                                    />
                                                    <Route 
                                                        path="/admin/reports" 
                                                        element={
                                                            <AdminRouteWrapper>
                                                                <AdminReports />
                                                            </AdminRouteWrapper>
                                                        } 
                                                    />
                                                    {/* Support & Info Routes */}
                                                    <Route 
                                                        path="/help" 
                                                        element={
                                                            <ProtectedRouteWrapper>
                                                                <Help />
                                                            </ProtectedRouteWrapper>
                                                        } 
                                                    />
                                                    <Route 
                                                        path="/contact" 
                                                        element={
                                                            <ProtectedRouteWrapper>
                                                                <Contact />
                                                            </ProtectedRouteWrapper>
                                                        } 
                                                    />
                                                    {/* Error Routes */}
                                                    <Route 
                                                        path="/unauthorized" 
                                                        element={
                                                            <AppLayout showNavbar={false}>
                                                                <Unauthorized />
                                                            </AppLayout>
                                                        } 
                                                    />
                                                    <Route 
                                                        path="/server-error" 
                                                        element={<Navigate to="/dashboard" replace />} 
                                                    />
                                                    {/* 404 - Not Found (must be last) */}
                                                    <Route 
                                                        path="*" 
                                                        element={<Navigate to="/dashboard" replace />} 
                                                    />
                                                </Routes>
                                            </Suspense>

                                            {/* Global Components */}
                                            <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
                limit={5}
            />
                                        </div>
                                    </AppInitializer>
                                </NotificationProvider>
                            </SocketProvider>
                        </Router>
                    </AuthProvider>
                </ThemeProvider>
                
                {/* React Query Devtools (development only) */}
                {process.env.NODE_ENV === 'development' && (
                    <ReactQueryDevtools 
                        initialIsOpen={false} 
                        position="bottom-right"
                    />
                )}
            </QueryClientProvider>
        </ErrorBoundary>
    );
}

export default App;
