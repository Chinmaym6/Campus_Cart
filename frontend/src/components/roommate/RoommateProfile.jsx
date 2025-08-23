import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import Toast from '../common/Toast';
import Modal from '../common/Modal';
import axios from 'axios';
import './RoommateProfile.css';

function RoommateProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [roommatePost, setRoommatePost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [compatibilityScore, setCompatibilityScore] = useState(null);
    const [userPreferences, setUserPreferences] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [showContactModal, setShowContactModal] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

    const isOwnProfile = user && user.id === profile?.user_id;

    useEffect(() => {
        if (id) {
            fetchProfileData();
        }
    }, [id]);

    const fetchProfileData = async () => {
        try {
            setLoading(true);
            
            // Fetch roommate post and profile
            const [postResponse, userPrefsResponse] = await Promise.all([
                axios.get(`/roommate-posts/${id}`),
                user ? axios.get('/roommate-preferences').catch(() => ({ data: {} })) : { data: {} }
            ]);
            
            setRoommatePost(postResponse.data.post);
            setProfile(postResponse.data.profile);
            setUserPreferences(userPrefsResponse.data.preferences);

            // Calculate compatibility if user has preferences
            if (userPrefsResponse.data.preferences && postResponse.data.post.compatibility_preferences) {
                const score = calculateCompatibility(
                    userPrefsResponse.data.preferences,
                    postResponse.data.post.compatibility_preferences
                );
                setCompatibilityScore(score);
            }
            
        } catch (error) {
            console.error('Error fetching profile:', error);
            if (error.response?.status === 404) {
                showToast('Roommate post not found', 'error');
                navigate('/roommates');
            } else {
                showToast('Error loading profile', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const calculateCompatibility = (userPrefs, matchPrefs) => {
        if (!userPrefs || !matchPrefs) return null;
        
        let score = 0;
        let totalWeight = 0;
        
        const weights = {
            cleanliness: 0.2,
            noise_level: 0.15,
            social_level: 0.15,
            sleep_schedule: 0.1,
            study_habits: 0.1,
            cooking_habits: 0.1,
            sharing_comfort: 0.1,
            pet_preference: 0.05,
            deal_breakers: 0.05
        };

        Object.entries(weights).forEach(([key, weight]) => {
            if (userPrefs[key] !== undefined && matchPrefs[key] !== undefined) {
                let compatibility = 1;
                
                if (key === 'deal_breakers') {
                    const userBreakers = Array.isArray(userPrefs[key]) ? userPrefs[key] : [];
                    const matchBreakers = Array.isArray(matchPrefs[key]) ? matchPrefs[key] : [];
                    const conflicts = userBreakers.filter(item => matchBreakers.includes(item));
                    compatibility = conflicts.length === 0 ? 1 : 0.3;
                } else if (typeof userPrefs[key] === 'number' && typeof matchPrefs[key] === 'number') {
                    const diff = Math.abs(userPrefs[key] - matchPrefs[key]);
                    compatibility = Math.max(0, 1 - (diff / 4));
                } else if (userPrefs[key] === matchPrefs[key]) {
                    compatibility = 1;
                } else {
                    compatibility = 0.5;
                }
                
                score += compatibility * weight;
                totalWeight += weight;
            }
        });

        return totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 50;
    };

    const handleStartChat = async () => {
        if (!user) {
            navigate('/login');
            return;
        }

        try {
            const response = await axios.post('/messages/start-chat', {
                recipientId: profile.user_id,
                context: 'roommate_inquiry',
                roommatePostId: roommatePost.id
            });
            
            navigate(`/messages/${response.data.chatId}`);
        } catch (error) {
            showToast('Error starting chat', 'error');
        }
        setShowContactModal(false);
    };

    const handleSavePost = async () => {
        if (!user) {
            navigate('/login');
            return;
        }

        try {
            await axios.post(`/roommate-posts/${roommatePost.id}/save`);
            setRoommatePost(prev => ({ ...prev, is_saved: true }));
            showToast('Post saved to your favorites!', 'success');
        } catch (error) {
            showToast('Error saving post', 'error');
        }
    };

    const handleReportPost = async (reason) => {
        try {
            await axios.post(`/roommate-posts/${roommatePost.id}/report`, { reason });
            showToast('Post reported. We\'ll review it shortly.', 'success');
        } catch (error) {
            showToast('Error reporting post', 'error');
        }
    };

    const showToast = (message, type = 'info') => {
        setToast({ show: true, message, type });
    };

    const closeToast = () => {
        setToast({ show: false, message: '', type: 'info' });
    };

    const formatBudget = (min, max) => {
        if (min && max) {
            return `$${min} - $${max}`;
        } else if (min) {
            return `$${min}+`;
        } else if (max) {
            return `Under $${max}`;
        }
        return 'Budget flexible';
    };

    const getCompatibilityColor = (score) => {
        if (score >= 80) return '#10b981';
        if (score >= 60) return '#f59e0b';
        return '#ef4444';
    };

    const getCompatibilityLabel = (score) => {
        if (score >= 80) return 'Excellent Match';
        if (score >= 60) return 'Good Match';
        return 'Fair Match';
    };

    if (loading) {
        return <LoadingSpinner message="Loading roommate profile..." overlay />;
    }

    if (!roommatePost || !profile) {
        return (
            <div className="profile-not-found">
                <h2>Roommate Post Not Found</h2>
                <p>The roommate post you're looking for doesn't exist or has been removed.</p>
                <Link to="/roommates" className="btn primary">
                    Back to Roommate Search
                </Link>
            </div>
        );
    }

    return (
        <div className="roommate-profile-page">
            <div className="roommate-profile-container">
                {/* Breadcrumb */}
                <nav className="breadcrumb">
                    <Link to="/roommates">Roommate Search</Link>
                    <span className="separator">›</span>
                    <span className="current">{roommatePost.title}</span>
                </nav>

                <div className="profile-content">
                    {/* Main Profile Card */}
                    <div className="profile-main">
                        {/* Profile Header */}
                        <div className="profile-header">
                            <div className="profile-info">
                                <div className="profile-avatar">
                                    {profile.profile_picture_url ? (
                                        <img src={profile.profile_picture_url} alt="Profile" />
                                    ) : (
                                        <span className="avatar-initials">
                                            {profile.first_name?.[0]}{profile.last_name?.[0]}
                                        </span>
                                    )}
                                    {profile.is_verified && (
                                        <div className="verified-badge" title="Verified Student">✅</div>
                                    )}
                                </div>
                                
                                <div className="profile-details">
                                    <h1 className="profile-name">
                                        {profile.first_name} {profile.last_name}
                                    </h1>
                                    
                                    <div className="profile-meta">
                                        {profile.age && (
                                            <span className="meta-item">
                                                👤 {profile.age} years old
                                            </span>
                                        )}
                                        {profile.graduation_year && (
                                            <span className="meta-item">
                                                🎓 Class of {profile.graduation_year}
                                            </span>
                                        )}
                                        <span className="meta-item">
                                            📅 Member since {new Date(profile.created_at).getFullYear()}
                                        </span>
                                    </div>

                                    {profile.bio && (
                                        <div className="profile-bio">
                                            <p>{profile.bio}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="profile-actions">
                                {compatibilityScore && (
                                    <div 
                                        className="compatibility-badge large"
                                        style={{ backgroundColor: getCompatibilityColor(compatibilityScore) }}
                                    >
                                        <span className="compatibility-score">{compatibilityScore}%</span>
                                        <span className="compatibility-label">
                                            {getCompatibilityLabel(compatibilityScore)}
                                        </span>
                                    </div>
                                )}

                                {!isOwnProfile && (
                                    <div className="action-buttons">
                                        <button 
                                            className="btn primary large"
                                            onClick={() => setShowContactModal(true)}
                                        >
                                            💬 Contact
                                        </button>
                                        <button 
                                            className="btn secondary"
                                            onClick={handleSavePost}
                                            disabled={roommatePost.is_saved}
                                        >
                                            {roommatePost.is_saved ? '❤️ Saved' : '🤍 Save'}
                                        </button>
                                    </div>
                                )}

                                {isOwnProfile && (
                                    <div className="owner-actions">
                                        <Link 
                                            to={`/roommates/edit/${roommatePost.id}`}
                                            className="btn primary"
                                        >
                                            ✏️ Edit Post
                                        </Link>
                                        <button className="btn secondary">
                                            📊 View Stats
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Post Content */}
                        <div className="post-section">
                            <div className="post-header">
                                <h2>{roommatePost.title}</h2>
                                <div className="post-meta">
                                    <span className="post-type" style={{ 
                                        backgroundColor: roommatePost.type === 'have_space' ? '#10b981' : 
                                                        roommatePost.type === 'looking_for_place' ? '#f59e0b' : '#667eea'
                                    }}>
                                        {roommatePost.type === 'have_space' ? 'Has space available' :
                                         roommatePost.type === 'looking_for_place' ? 'Looking for place' :
                                         'Looking for roommate'}
                                    </span>
                                    <span className="post-date">
                                        Posted {new Date(roommatePost.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>

                            <div className="post-description">
                                <p>{roommatePost.description}</p>
                            </div>

                            {/* Key Details */}
                            <div className="key-details-section">
                                <h3>Key Details</h3>
                                <div className="details-grid">
                                    <div className="detail-card">
                                        <div className="detail-icon">💰</div>
                                        <div className="detail-content">
                                            <div className="detail-label">Budget</div>
                                            <div className="detail-value">
                                                {formatBudget(roommatePost.budget_min, roommatePost.budget_max)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="detail-card">
                                        <div className="detail-icon">📍</div>
                                        <div className="detail-content">
                                            <div className="detail-label">Location</div>
                                            <div className="detail-value">
                                                {roommatePost.location || 'Flexible'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="detail-card">
                                        <div className="detail-icon">📅</div>
                                        <div className="detail-content">
                                            <div className="detail-label">Move-in Date</div>
                                            <div className="detail-value">
                                                {roommatePost.move_in_date 
                                                    ? new Date(roommatePost.move_in_date).toLocaleDateString()
                                                    : 'Flexible'
                                                }
                                            </div>
                                        </div>
                                    </div>

                                    <div className="detail-card">
                                        <div className="detail-icon">⏰</div>
                                        <div className="detail-content">
                                            <div className="detail-label">Lease Duration</div>
                                            <div className="detail-value">
                                                {roommatePost.lease_duration?.replace('_', ' ') || 'Flexible'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="detail-card">
                                        <div className="detail-icon">🏠</div>
                                        <div className="detail-content">
                                            <div className="detail-label">Room Type</div>
                                            <div className="detail-value">
                                                {roommatePost.room_type?.replace('_', ' ') || 'Flexible'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Images */}
                            {roommatePost.images && roommatePost.images.length > 0 && (
                                <div className="images-section">
                                    <h3>Photos</h3>
                                    <div className="images-grid">
                                        {roommatePost.images.map((image, index) => (
                                            <div 
                                                key={index}
                                                className="image-thumbnail"
                                                onClick={() => {
                                                    setCurrentImageIndex(index);
                                                    setShowImageModal(true);
                                                }}
                                            >
                                                <img src={image} alt={`Photo ${index + 1}`} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Amenities */}
                            {roommatePost.amenities && roommatePost.amenities.length > 0 && (
                                <div className="amenities-section">
                                    <h3>Desired Amenities</h3>
                                    <div className="amenities-grid">
                                        {roommatePost.amenities.map(amenity => (
                                            <div key={amenity} className="amenity-item">
                                                ✅ {amenity.replace('_', ' ')}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="profile-sidebar">
                        {/* Preferences Card */}
                        {roommatePost.preferences && (
                            <div className="preferences-card">
                                <h3>🎯 Roommate Preferences</h3>
                                <div className="preferences-list">
                                    {roommatePost.preferences.gender_preference && 
                                     roommatePost.preferences.gender_preference !== 'no_preference' && (
                                        <div className="preference-item">
                                            <span className="preference-label">Gender:</span>
                                            <span className="preference-value">
                                                {roommatePost.preferences.gender_preference}
                                            </span>
                                        </div>
                                    )}
                                    
                                    <div className="preference-item">
                                        <span className="preference-label">Age Range:</span>
                                        <span className="preference-value">
                                            {roommatePost.preferences.age_range_min} - {roommatePost.preferences.age_range_max} years
                                        </span>
                                    </div>

                                    <div className="preference-item">
                                        <span className="preference-label">Smoking:</span>
                                        <span className="preference-value">
                                            {roommatePost.preferences.smoking === 'no' ? 'Non-smoker preferred' :
                                             roommatePost.preferences.smoking === 'outside_only' ? 'Outside only' : 'OK'}
                                        </span>
                                    </div>

                                    <div className="preference-item">
                                        <span className="preference-label">Pets:</span>
                                        <span className="preference-value">
                                            {roommatePost.preferences.pets === 'no_pets' ? 'No pets' :
                                             roommatePost.preferences.pets === 'ok_with_pets' ? 'OK with pets' :
                                             roommatePost.preferences.pets === 'have_pets' ? 'Has pets' : 'No preference'}
                                        </span>
                                    </div>

                                    {roommatePost.preferences.student_only && (
                                        <div className="preference-item">
                                            <span className="preference-label">Students only:</span>
                                            <span className="preference-value">Yes</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Compatibility Breakdown */}
                        {compatibilityScore && userPreferences && roommatePost.compatibility_preferences && (
                            <div className="compatibility-card">
                                <h3>📊 Compatibility Details</h3>
                                <div className="compatibility-breakdown">
                                    {Object.entries(userPreferences).map(([key, value]) => {
                                        if (roommatePost.compatibility_preferences[key] !== undefined) {
                                            const matchValue = roommatePost.compatibility_preferences[key];
                                            const isMatch = value === matchValue;
                                            
                                            return (
                                                <div key={key} className="compatibility-item">
                                                    <span className="compatibility-trait">
                                                        {key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                    </span>
                                                    <span className={`compatibility-status ${isMatch ? 'match' : 'different'}`}>
                                                        {isMatch ? '✅' : '⚠️'}
                                                    </span>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Safety & Trust */}
                        <div className="safety-card">
                            <h3>🛡️ Safety & Trust</h3>
                            <div className="safety-items">
                                {profile.is_verified && (
                                    <div className="safety-item verified">
                                        ✅ Student verified
                                    </div>
                                )}
                                <div className="safety-item">
                                    🔒 Identity protected
                                </div>
                                <div className="safety-item">
                                    💬 Secure messaging
                                </div>
                                {profile.response_rate && (
                                    <div className="safety-item">
                                        ⚡ {profile.response_rate}% response rate
                                    </div>
                                )}
                            </div>
                            
                            {!isOwnProfile && (
                                <button 
                                    className="report-btn"
                                    onClick={() => handleReportPost('inappropriate')}
                                >
                                    🚩 Report this post
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Contact Modal */}
            <Modal
                isOpen={showContactModal}
                onClose={() => setShowContactModal(false)}
                title="Contact Roommate"
                size="medium"
            >
                <div className="contact-modal-content">
                    <div className="contact-preview">
                        <div className="contact-avatar">
                            {profile.profile_picture_url ? (
                                <img src={profile.profile_picture_url} alt="Profile" />
                            ) : (
                                <span>{profile.first_name?.[0]}{profile.last_name?.[0]}</span>
                            )}
                        </div>
                        <div className="contact-info">
                            <h4>{profile.first_name} {profile.last_name}</h4>
                            <p>"{roommatePost.title}"</p>
                        </div>
                    </div>

                    <div className="contact-message">
                        <p>Start a conversation about this roommate posting!</p>
                        <div className="message-tips">
                            <h5>💡 Tips for a good first message:</h5>
                            <ul>
                                <li>Introduce yourself briefly</li>
                                <li>Mention what interests you about their post</li>
                                <li>Share a bit about your lifestyle</li>
                                <li>Ask specific questions</li>
                            </ul>
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button 
                            className="btn secondary"
                            onClick={() => setShowContactModal(false)}
                        >
                            Cancel
                        </button>
                        <button 
                            className="btn primary"
                            onClick={handleStartChat}
                        >
                            💬 Start Chat
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Image Modal */}
            <Modal
                isOpen={showImageModal}
                onClose={() => setShowImageModal(false)}
                title=""
                size="large"
                showHeader={false}
            >
                <div className="image-modal">
                    <button 
                        className="image-modal-close"
                        onClick={() => setShowImageModal(false)}
                    >
                        ×
                    </button>
                    
                    {roommatePost.images && roommatePost.images[currentImageIndex] && (
                        <img 
                            src={roommatePost.images[currentImageIndex]} 
                            alt={`Photo ${currentImageIndex + 1}`}
                            className="modal-image"
                        />
                    )}
                    
                    {roommatePost.images && roommatePost.images.length > 1 && (
                        <div className="image-navigation">
                            <button 
                                className="nav-btn prev"
                                onClick={() => setCurrentImageIndex(
                                    currentImageIndex > 0 ? currentImageIndex - 1 : roommatePost.images.length - 1
                                )}
                            >
                                ‹
                            </button>
                            <span className="image-counter">
                                {currentImageIndex + 1} / {roommatePost.images.length}
                            </span>
                            <button 
                                className="nav-btn next"
                                onClick={() => setCurrentImageIndex(
                                    currentImageIndex < roommatePost.images.length - 1 ? currentImageIndex + 1 : 0
                                )}
                            >
                                ›
                            </button>
                        </div>
                    )}
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

export default RoommateProfile;

