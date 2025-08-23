import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Toast, { ToastManager } from '../../components/common/Toast';
import Modal from '../../components/common/Modal';
import axios from 'axios';
import './Dashboard.css';

function Dashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalListings: 0,
        activeListings: 0,
        soldItems: 0,
        messages: 0,
        savedItems: 0
    });
    const [recentListings, setRecentListings] = useState([]);
    const [recentMessages, setRecentMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

    useEffect(() => {
        fetchDashboardData();
        
        // Show welcome modal for new users
        const isNewUser = localStorage.getItem('isNewUser');
        if (isNewUser === 'true') {
            setShowWelcomeModal(true);
            localStorage.removeItem('isNewUser');
        }
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            
            // Fetch user's listings
            const listingsResponse = await axios.get('/items/my-listings');
            const listings = listingsResponse.data.items || [];
            
            // Calculate stats
            setStats({
                totalListings: listings.length,
                activeListings: listings.filter(item => item.status === 'available').length,
                soldItems: listings.filter(item => item.status === 'sold').length,
                messages: 5, // Placeholder - will be replaced with real API call
                savedItems: 12 // Placeholder - will be replaced with real API call
            });
            
            // Set recent listings (last 4)
            setRecentListings(listings.slice(0, 4));
            
            // Set recent messages (placeholder - will be replaced with real API call)
            setRecentMessages([
                { id: 1, sender: 'John Doe', message: 'Is the MacBook still available?', time: '2 hours ago' },
                { id: 2, sender: 'Sarah Smith', message: 'Can we meet tomorrow?', time: '1 day ago' }
            ]);
            
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setToast({
                show: true,
                message: 'Error loading dashboard data',
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const showToast = (message, type = 'info') => {
        setToast({ show: true, message, type });
    };

    const closeToast = () => {
        setToast({ show: false, message: '', type: 'info' });
    };

    if (loading) {
        return <LoadingSpinner message="Loading your dashboard..." />;
    }

    return (
        <div className="dashboard-page">
            <div className="dashboard-container">
                {/* Welcome Section */}
                <div className="dashboard-header">
                    <div className="welcome-section">
                        <h1>Welcome back, {user?.firstName || user?.first_name}! 👋</h1>
                        <p>Here's what's happening with your Campus Cart account</p>
                    </div>
                    <div className="quick-actions">
                        <Link to="/items/create" className="btn primary">
                            📦 Sell Item
                        </Link>
                        <Link to="/roommates/create" className="btn secondary">
                            🏠 Post Roommate Ad
                        </Link>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon">📦</div>
                        <div className="stat-content">
                            <div className="stat-number">{stats.totalListings}</div>
                            <div className="stat-label">Total Listings</div>
                        </div>
                        <div className="stat-trend positive">+2 this week</div>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-icon">✅</div>
                        <div className="stat-content">
                            <div className="stat-number">{stats.activeListings}</div>
                            <div className="stat-label">Active Listings</div>
                        </div>
                        <div className="stat-trend neutral">No change</div>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-icon">💰</div>
                        <div className="stat-content">
                            <div className="stat-number">{stats.soldItems}</div>
                            <div className="stat-label">Items Sold</div>
                        </div>
                        <div className="stat-trend positive">+1 this week</div>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-icon">💬</div>
                        <div className="stat-content">
                            <div className="stat-number">{stats.messages}</div>
                            <div className="stat-label">New Messages</div>
                        </div>
                        <div className="stat-trend positive">+3 unread</div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="dashboard-content">
                    {/* Recent Listings */}
                    <div className="dashboard-section">
                        <div className="section-header">
                            <h2>Your Recent Listings</h2>
                            <Link to="/my-listings" className="section-link">
                                View All →
                            </Link>
                        </div>
                        
                        {recentListings.length > 0 ? (
                            <div className="listings-grid">
                                {recentListings.map(item => (
                                    <div key={item.id} className="listing-card">
                                        <div className="listing-image">
                                            {item.images && item.images.length > 0 ? (
                                                <img src={item.images[0].url || item.images} alt={item.title} />
                                            ) : (
                                                <div className="no-image">📦</div>
                                            )}
                                        </div>
                                        <div className="listing-content">
                                            <h3 className="listing-title">{item.title}</h3>
                                            <div className="listing-price">${item.price}</div>
                                            <div className={`listing-status ${item.status}`}>
                                                {item.status === 'available' ? '✅ Active' : '❌ Sold'}
                                            </div>
                                        </div>
                                        <div className="listing-actions">
                                            <Link to={`/items/${item.id}`} className="btn-small primary">
                                                View
                                            </Link>
                                            <Link to={`/items/${item.id}/edit`} className="btn-small secondary">
                                                Edit
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-icon">📦</div>
                                <h3>No listings yet</h3>
                                <p>Start selling by creating your first listing!</p>
                                <Link to="/items/create" className="btn primary">
                                    Create Your First Listing
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Recent Messages */}
                    <div className="dashboard-section">
                        <div className="section-header">
                            <h2>Recent Messages</h2>
                            <Link to="/messages" className="section-link">
                                View All →
                            </Link>
                        </div>
                        
                        <div className="messages-list">
                            {recentMessages.map(message => (
                                <div key={message.id} className="message-item">
                                    <div className="message-avatar">
                                        {message.sender.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div className="message-content">
                                        <div className="message-sender">{message.sender}</div>
                                        <div className="message-text">{message.message}</div>
                                        <div className="message-time">{message.time}</div>
                                    </div>
                                    <div className="message-unread"></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="dashboard-section">
                        <h2>Quick Actions</h2>
                        <div className="quick-links-grid">
                            <Link to="/profile" className="quick-link-card">
                                <div className="quick-link-icon">👤</div>
                                <div className="quick-link-content">
                                    <h3>Edit Profile</h3>
                                    <p>Update your information</p>
                                </div>
                            </Link>
                            
                            <Link to="/saved-items" className="quick-link-card">
                                <div className="quick-link-icon">❤️</div>
                                <div className="quick-link-content">
                                    <h3>Saved Items</h3>
                                    <p>{stats.savedItems} items saved</p>
                                </div>
                            </Link>
                            
                            <Link to="/messages" className="quick-link-card">
                                <div className="quick-link-icon">💬</div>
                                <div className="quick-link-content">
                                    <h3>Messages</h3>
                                    <p>Chat with buyers & sellers</p>
                                </div>
                            </Link>
                            
                            <Link to="/help" className="quick-link-card">
                                <div className="quick-link-icon">❓</div>
                                <div className="quick-link-content">
                                    <h3>Help & Support</h3>
                                    <p>Get help when you need it</p>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Welcome Modal for new users */}
            <Modal
                isOpen={showWelcomeModal}
                onClose={() => setShowWelcomeModal(false)}
                title="Welcome to Campus Cart! 🎉"
                size="medium"
            >
                <div className="welcome-modal-content">
                    <p>You're all set up! Here are a few things you can do to get started:</p>
                    <ul className="welcome-checklist">
                        <li>✅ Create your first listing to sell items</li>
                        <li>🔍 Browse the marketplace for great deals</li>
                        <li>🏠 Find your perfect roommate</li>
                        <li>💬 Start chatting with other students</li>
                    </ul>
                    <div className="welcome-actions">
                        <Link 
                            to="/items/create" 
                            className="btn primary"
                            onClick={() => setShowWelcomeModal(false)}
                        >
                            Create First Listing
                        </Link>
                        <button 
                            className="btn secondary"
                            onClick={() => setShowWelcomeModal(false)}
                        >
                            Explore Later
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Toast Notifications */}
            {toast.show && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={closeToast}
                    position="top-right"
                />
            )}
        </div>
    );
}

export default Dashboard;
