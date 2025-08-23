import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import Toast from '../common/Toast';
import ItemGrid from '../marketplace/ItemGrid';
import api from '../../utils/api';
import './UserProfile.css';

function UserProfile() {
    const { id } = useParams();
    const { user: currentUser } = useAuth();
    const [profileUser, setProfileUser] = useState(null);
    const [userItems, setUserItems] = useState([]);
    const [userReviews, setUserReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('items');
    const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

    const isOwnProfile = currentUser && currentUser.id === id;

    useEffect(() => {
        if (id) {
            fetchUserProfile();
        }
    }, [id]);

    const fetchUserProfile = async () => {
        try {
            setLoading(true);
            const [profileResponse, itemsResponse, reviewsResponse] = await Promise.all([
                axios.get(`/users/${id}/profile`),
                axios.get(`/users/${id}/items`),
                axios.get(`/users/${id}/reviews`)
            ]);
            
            setProfileUser(profileResponse.data.user);
            setUserItems(itemsResponse.data.items || []);
            setUserReviews(reviewsResponse.data.reviews || []);
        } catch (error) {
            console.error('Error fetching user profile:', error);
            if (error.response?.status === 404) {
                showToast('User not found', 'error');
            } else {
                showToast('Error loading profile', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleStartChat = async () => {
        if (!currentUser) {
            showToast('Please log in to contact this user', 'error');
            return;
        }

        try {
            const response = await api.post('/messages/start-chat', {
                recipientId: profileUser.id
            });
            
            window.location.href = `/messages/${response.data.chatId}`;
        } catch (error) {
            showToast('Error starting chat', 'error');
        }
    };

    const showToast = (message, type = 'info') => {
        setToast({ show: true, message, type });
    };

    const closeToast = () => {
        setToast({ show: false, message: '', type: 'info' });
    };

    const renderStars = (rating) => {
        return (
            <div className="star-rating">
                {[1, 2, 3, 4, 5].map(star => (
                    <span 
                        key={star} 
                        className={`star ${star <= rating ? 'filled' : ''}`}
                    >
                        ⭐
                    </span>
                ))}
            </div>
        );
    };

    const getAverageRating = () => {
        if (userReviews.length === 0) return 0;
        const sum = userReviews.reduce((acc, review) => acc + review.rating, 0);
        return (sum / userReviews.length).toFixed(1);
    };

    if (loading) {
        return <LoadingSpinner message="Loading profile..." overlay />;
    }

    if (!profileUser) {
        return (
            <div className="profile-not-found">
                <h2>Profile Not Found</h2>
                <p>The user you're looking for doesn't exist or has been removed.</p>
                <Link to="/marketplace" className="btn primary">
                    Back to Marketplace
                </Link>
            </div>
        );
    }

    const averageRating = getAverageRating();
    const totalItemsSold = userItems.filter(item => item.status === 'sold').length;
    const memberSince = new Date(profileUser.created_at).getFullYear();

    return (
        <div className="user-profile-page">
            <div className="user-profile-container">
                {/* Profile Header */}
                <div className="profile-header">
                    <div className="profile-info">
                        <div className="profile-avatar">
                            {profileUser.profile_picture_url ? (
                                <img src={profileUser.profile_picture_url} alt="Profile" />
                            ) : (
                                <span className="avatar-initials">
                                    {profileUser.first_name?.[0]}{profileUser.last_name?.[0]}
                                </span>
                            )}
                        </div>
                        
                        <div className="profile-details">
                            <h1 className="profile-name">
                                {profileUser.first_name} {profileUser.last_name}
                                {profileUser.is_verified && (
                                    <span className="verified-badge" title="Verified Student">
                                        ✅
                                    </span>
                                )}
                            </h1>
                            
                            <div className="profile-meta">
                                <div className="meta-item">
                                    <span className="meta-icon">🎓</span>
                                    <span>Class of {profileUser.graduation_year}</span>
                                </div>
                                <div className="meta-item">
                                    <span className="meta-icon">📅</span>
                                    <span>Member since {memberSince}</span>
                                </div>
                                {profileUser.privacy_settings?.show_location && profileUser.location_address && (
                                    <div className="meta-item">
                                        <span className="meta-icon">📍</span>
                                        <span>{profileUser.location_address}</span>
                                    </div>
                                )}
                            </div>

                            {profileUser.bio && (
                                <div className="profile-bio">
                                    <p>{profileUser.bio}</p>
                                </div>
                            )}

                            {/* Social Links */}
                            {profileUser.social_links && Object.values(profileUser.social_links).some(link => link) && (
                                <div className="social-links">
                                    {profileUser.social_links.instagram && (
                                        <a 
                                            href={`https://instagram.com/${profileUser.social_links.instagram}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="social-link instagram"
                                        >
                                            📷
                                        </a>
                                    )}
                                    {profileUser.social_links.facebook && (
                                        <a 
                                            href={`https://facebook.com/${profileUser.social_links.facebook}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="social-link facebook"
                                        >
                                            📘
                                        </a>
                                    )}
                                    {profileUser.social_links.twitter && (
                                        <a 
                                            href={`https://twitter.com/${profileUser.social_links.twitter}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="social-link twitter"
                                        >
                                            🐦
                                        </a>
                                    )}
                                    {profileUser.social_links.linkedin && (
                                        <a 
                                            href={`https://linkedin.com/in/${profileUser.social_links.linkedin}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="social-link linkedin"
                                        >
                                            💼
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="profile-actions">
                        {isOwnProfile ? (
                            <Link to="/profile/edit" className="btn primary">
                                ✏️ Edit Profile
                            </Link>
                        ) : (
                            <button className="btn primary" onClick={handleStartChat}>
                                💬 Send Message
                            </button>
                        )}
                    </div>
                </div>

                {/* Profile Stats */}
                <div className="profile-stats">
                    <div className="stat-card">
                        <div className="stat-number">{userItems.filter(i => i.status === 'available').length}</div>
                        <div className="stat-label">Active Listings</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">{totalItemsSold}</div>
                        <div className="stat-label">Items Sold</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">
                            {averageRating > 0 ? averageRating : 'N/A'}
                        </div>
                        <div className="stat-label">Rating</div>
                        {averageRating > 0 && renderStars(Math.round(averageRating))}
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">{userReviews.length}</div>
                        <div className="stat-label">Reviews</div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="tab-navigation">
                    <button
                        className={`tab-button ${activeTab === 'items' ? 'active' : ''}`}
                        onClick={() => setActiveTab('items')}
                    >
                        Items ({userItems.filter(i => i.status === 'available').length})
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'reviews' ? 'active' : ''}`}
                        onClick={() => setActiveTab('reviews')}
                    >
                        Reviews ({userReviews.length})
                    </button>
                </div>

                {/* Tab Content */}
                <div className="tab-content">
                    {activeTab === 'items' ? (
                        <div className="items-section">
                            <ItemGrid
                                items={userItems.filter(item => item.status === 'available')}
                                loading={false}
                                emptyMessage={isOwnProfile ? "You haven't listed any items yet" : "No active listings"}
                                emptyDescription={isOwnProfile ? "Create your first listing to start selling!" : "This user doesn't have any active listings."}
                            />
                        </div>
                    ) : (
                        <div className="reviews-section">
                            {userReviews.length > 0 ? (
                                <div className="reviews-list">
                                    {userReviews.map(review => (
                                        <div key={review.id} className="review-card">
                                            <div className="review-header">
                                                <div className="reviewer-info">
                                                    <div className="reviewer-avatar">
                                                        {review.reviewer_avatar ? (
                                                            <img src={review.reviewer_avatar} alt="Reviewer" />
                                                        ) : (
                                                            <span>{review.reviewer_name?.charAt(0)}</span>
                                                        )}
                                                    </div>
                                                    <div className="reviewer-details">
                                                        <div className="reviewer-name">{review.reviewer_name}</div>
                                                        <div className="review-date">
                                                            {new Date(review.created_at).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                </div>
                                                {renderStars(review.rating)}
                                            </div>
                                            
                                            <div className="review-content">
                                                <div className="item-info">
                                                    <span className="item-label">Item:</span>
                                                    <span className="item-name">{review.item_title}</span>
                                                </div>
                                                
                                                {review.comment && (
                                                    <div className="review-comment">
                                                        "{review.comment}"
                                                    </div>
                                                )}

                                                {review.reply && (
                                                    <div className="seller-reply">
                                                        <div className="reply-header">
                                                            <strong>Seller's Reply:</strong>
                                                        </div>
                                                        <div className="reply-text">"{review.reply}"</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <div className="empty-icon">⭐</div>
                                    <h3>No reviews yet</h3>
                                    <p>
                                        {isOwnProfile 
                                            ? "Start selling to receive reviews from buyers!"
                                            : "This user hasn't received any reviews yet."
                                        }
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
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
    );
}

export default UserProfile;
