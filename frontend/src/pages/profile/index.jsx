import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Toast from '../../components/common/Toast';
import ItemCard from '../../components/marketplace/ItemCard';
import axios from 'axios';
import './index.css';

function ProfilePage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [profileData, setProfileData] = useState(null);
    const [recentListings, setRecentListings] = useState([]);
    const [stats, setStats] = useState({
        totalListings: 0,
        soldItems: 0,
        totalEarnings: 0,
        savedItems: 0,
        reviewsReceived: 0,
        averageRating: 0
    });
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

    useEffect(() => {
        if (user) {
            fetchProfileData();
        } else {
            navigate('/login');
        }
    }, [user, navigate]);

    const fetchProfileData = async () => {
        try {
            setLoading(true);
            
            const [profileResponse, statsResponse, listingsResponse] = await Promise.all([
                axios.get('/users/profile'),
                axios.get('/users/profile/stats'),
                axios.get('/items/my-listings?limit=6')
            ]);
            
            setProfileData(profileResponse.data.user);
            setStats(statsResponse.data.stats || {});
            setRecentListings(listingsResponse.data.items || []);
            
        } catch (error) {
            console.error('Error fetching profile data:', error);
            showToast('Error loading profile data', 'error');
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

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(price);
    };

    if (loading) {
        return <LoadingSpinner message="Loading your profile..." overlay />;
    }

    if (!profileData) {
        return (
            <div className="profile-error">
                <h2>Profile Not Found</h2>
                <p>Unable to load your profile information.</p>
                <Link to="/profile/edit" className="btn primary">
                    Complete Your Profile
                </Link>
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>My Profile - Campus Cart</title>
                <meta name="description" content="Manage your Campus Cart profile, view your listings, and track your marketplace activity." />
            </Helmet>

            <div className="profile-page">
                <div className="profile-container">
                    {/* Profile Header */}
                    <div className="profile-header">
                        <div className="header-background">
                            <div className="header-pattern"></div>
                        </div>
                        
                        <div className="profile-info">
                            <div className="profile-avatar">
                                {profileData.profile_picture_url ? (
                                    <img src={profileData.profile_picture_url} alt="Profile" />
                                ) : (
                                    <span className="avatar-initials">
                                        {profileData.first_name?.[0]}{profileData.last_name?.[0]}
                                    </span>
                                )}
                                {profileData.is_verified && (
                                    <div className="verified-badge" title="Verified Student">✅</div>
                                )}
                            </div>
                            
                            <div className="profile-details">
                                <h1 className="profile-name">
                                    {profileData.first_name} {profileData.last_name}
                                </h1>
                                
                                <div className="profile-meta">
                                    {profileData.student_id && (
                                        <span className="meta-item">
                                            🎓 Student ID: {profileData.student_id}
                                        </span>
                                    )}
                                    {profileData.graduation_year && (
                                        <span className="meta-item">
                                            📅 Class of {profileData.graduation_year}
                                        </span>
                                    )}
                                    <span className="meta-item">
                                        📧 {profileData.email}
                                    </span>
                                    <span className="meta-item">
                                        📅 Member since {new Date(profileData.created_at).toLocaleDateString()}
                                    </span>
                                </div>

                                {profileData.bio && (
                                    <div className="profile-bio">
                                        <p>{profileData.bio}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="profile-actions">
                            <Link to="/profile/edit" className="btn primary">
                                ✏️ Edit Profile
                            </Link>
                            <Link to="/profile/settings" className="btn secondary">
                                ⚙️ Settings
                            </Link>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="profile-stats">
                        <div className="stat-card">
                            <div className="stat-icon">📦</div>
                            <div className="stat-content">
                                <div className="stat-number">{stats.totalListings || 0}</div>
                                <div className="stat-label">Total Listings</div>
                            </div>
                        </div>
                        
                        <div className="stat-card">
                            <div className="stat-icon">💰</div>
                            <div className="stat-content">
                                <div className="stat-number">{stats.soldItems || 0}</div>
                                <div className="stat-label">Items Sold</div>
                            </div>
                        </div>
                        
                        <div className="stat-card">
                            <div className="stat-icon">💵</div>
                            <div className="stat-content">
                                <div className="stat-number">{formatPrice(stats.totalEarnings || 0)}</div>
                                <div className="stat-label">Total Earned</div>
                            </div>
                        </div>
                        
                        <div className="stat-card">
                            <div className="stat-icon">❤️</div>
                            <div className="stat-content">
                                <div className="stat-number">{stats.savedItems || 0}</div>
                                <div className="stat-label">Saved Items</div>
                            </div>
                        </div>
                        
                        <div className="stat-card">
                            <div className="stat-icon">⭐</div>
                            <div className="stat-content">
                                <div className="stat-number">
                                    {stats.averageRating ? stats.averageRating.toFixed(1) : '0.0'}
                                </div>
                                <div className="stat-label">Avg Rating</div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="quick-actions">
                        <h2>Quick Actions</h2>
                        <div className="actions-grid">
                            <Link to="/marketplace/create" className="action-card">
                                <div className="action-icon">📦</div>
                                <div className="action-content">
                                    <h3>Sell an Item</h3>
                                    <p>Create a new listing to sell your items</p>
                                </div>
                                <div className="action-arrow">→</div>
                            </Link>
                            
                            <Link to="/profile/listings" className="action-card">
                                <div className="action-icon">📋</div>
                                <div className="action-content">
                                    <h3>My Listings</h3>
                                    <p>Manage your current and past listings</p>
                                </div>
                                <div className="action-arrow">→</div>
                            </Link>
                            
                            <Link to="/profile/purchases" className="action-card">
                                <div className="action-icon">🛍️</div>
                                <div className="action-content">
                                    <h3>Purchase History</h3>
                                    <p>View items you've bought</p>
                                </div>
                                <div className="action-arrow">→</div>
                            </Link>
                            
                            <Link to="/profile/saved" className="action-card">
                                <div className="action-icon">❤️</div>
                                <div className="action-content">
                                    <h3>Saved Items</h3>
                                    <p>Items you've saved for later</p>
                                </div>
                                <div className="action-arrow">→</div>
                            </Link>
                            
                            <Link to="/roommates" className="action-card">
                                <div className="action-icon">🏠</div>
                                <div className="action-content">
                                    <h3>Find Roommates</h3>
                                    <p>Search for compatible roommates</p>
                                </div>
                                <div className="action-arrow">→</div>
                            </Link>
                            
                            <Link to="/messages" className="action-card">
                                <div className="action-icon">💬</div>
                                <div className="action-content">
                                    <h3>Messages</h3>
                                    <p>Chat with buyers and sellers</p>
                                </div>
                                <div className="action-arrow">→</div>
                            </Link>
                        </div>
                    </div>

                    {/* Recent Listings */}
                    <div className="recent-listings">
                        <div className="section-header">
                            <h2>Recent Listings</h2>
                            <Link to="/profile/listings" className="view-all-link">
                                View All ({stats.totalListings})
                            </Link>
                        </div>
                        
                        {recentListings.length > 0 ? (
                            <div className="listings-grid">
                                {recentListings.map(item => (
                                    <ItemCard 
                                        key={item.id} 
                                        item={item}
                                        showActions={false}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="empty-listings">
                                <div className="empty-icon">📦</div>
                                <h3>No listings yet</h3>
                                <p>Start selling by creating your first listing!</p>
                                <Link to="/marketplace/create" className="btn primary">
                                    Create First Listing
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Profile Completion */}
                    {(!profileData.profile_picture_url || !profileData.bio || !profileData.phone) && (
                        <div className="profile-completion">
                            <h2>Complete Your Profile</h2>
                            <p>Add more information to build trust with other users</p>
                            
                            <div className="completion-items">
                                {!profileData.profile_picture_url && (
                                    <div className="completion-item">
                                        <div className="item-icon">📷</div>
                                        <div className="item-content">
                                            <h4>Add Profile Picture</h4>
                                            <p>Help others recognize you</p>
                                        </div>
                                        <Link to="/profile/edit" className="btn secondary small">
                                            Add Photo
                                        </Link>
                                    </div>
                                )}
                                
                                {!profileData.bio && (
                                    <div className="completion-item">
                                        <div className="item-icon">📝</div>
                                        <div className="item-content">
                                            <h4>Write a Bio</h4>
                                            <p>Tell others about yourself</p>
                                        </div>
                                        <Link to="/profile/edit" className="btn secondary small">
                                            Add Bio
                                        </Link>
                                    </div>
                                )}
                                
                                {!profileData.phone && (
                                    <div className="completion-item">
                                        <div className="item-icon">📱</div>
                                        <div className="item-content">
                                            <h4>Add Phone Number</h4>
                                            <p>For easier communication</p>
                                        </div>
                                        <Link to="/profile/edit" className="btn secondary small">
                                            Add Phone
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Recent Activity */}
                    <div className="recent-activity">
                        <h2>Recent Activity</h2>
                        <div className="activity-list">
                            <div className="activity-item">
                                <div className="activity-icon">🎉</div>
                                <div className="activity-content">
                                    <div className="activity-text">
                                        Welcome to Campus Cart! Complete your profile to get started.
                                    </div>
                                    <div className="activity-time">
                                        {new Date(profileData.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

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
        </>
    );
}

export default ProfilePage;
