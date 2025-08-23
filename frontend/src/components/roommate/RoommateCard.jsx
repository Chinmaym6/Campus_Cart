import React from 'react';
import { Link } from 'react-router-dom';
import './RoommateCard.css';

function RoommateCard({ 
    roommate, 
    showCompatibility = false, 
    compatibilityScore = null,
    onSave,
    onContact,
    isSaved = false 
}) {
    
    const formatBudget = (min, max) => {
        if (min && max) {
            return `$${min} - $${max}`;
        } else if (min) {
            return `$${min}+`;
        } else if (max) {
            return `Under $${max}`;
        }
        return 'Budget not specified';
    };

    const formatMoveInDate = (dateString) => {
        if (!dateString) return 'Flexible';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = date - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return 'ASAP';
        if (diffDays <= 7) return 'This week';
        if (diffDays <= 30) return 'This month';
        if (diffDays <= 90) return 'Within 3 months';
        
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            year: 'numeric' 
        });
    };

    const getTypeColor = (type) => {
        const colors = {
            'looking_for_roommate': '#667eea',
            'have_space': '#10b981',
            'looking_for_place': '#f59e0b'
        };
        return colors[type] || '#6b7280';
    };

    const getTypeLabel = (type) => {
        const labels = {
            'looking_for_roommate': 'Looking for roommate',
            'have_space': 'Has space available',
            'looking_for_place': 'Looking for place'
        };
        return labels[type] || type.replace('_', ' ');
    };

    const getCompatibilityColor = (score) => {
        if (score >= 80) return '#10b981';
        if (score >= 60) return '#f59e0b';
        return '#ef4444';
    };

    return (
        <div className="roommate-card">
            {/* Card Header */}
            <div className="card-header">
                {showCompatibility && compatibilityScore && (
                    <div 
                        className="compatibility-indicator"
                        style={{ backgroundColor: getCompatibilityColor(compatibilityScore) }}
                    >
                        {compatibilityScore}% Match
                    </div>
                )}
                
                <div 
                    className="post-type-badge"
                    style={{ backgroundColor: getTypeColor(roommate.type) }}
                >
                    {getTypeLabel(roommate.type)}
                </div>
                
                {onSave && (
                    <button
                        className={`save-button ${isSaved ? 'saved' : ''}`}
                        onClick={() => onSave(roommate.id)}
                        aria-label={isSaved ? 'Remove from saved' : 'Save match'}
                    >
                        {isSaved ? '❤️' : '🤍'}
                    </button>
                )}
            </div>

            {/* Profile Section */}
            <div className="profile-section">
                <div className="profile-avatar">
                    {roommate.profile_picture_url ? (
                        <img src={roommate.profile_picture_url} alt="Profile" />
                    ) : (
                        <span className="avatar-initials">
                            {roommate.first_name?.[0]}{roommate.last_name?.[0]}
                        </span>
                    )}
                    {roommate.is_verified && (
                        <div className="verified-badge" title="Verified Student">✅</div>
                    )}
                </div>
                
                <div className="profile-info">
                    <h3 className="profile-name">
                        {roommate.first_name} {roommate.last_name}
                    </h3>
                    {roommate.age && (
                        <span className="profile-age">Age {roommate.age}</span>
                    )}
                    <div className="profile-details">
                        {roommate.graduation_year && (
                            <span className="detail-item">
                                🎓 Class of {roommate.graduation_year}
                            </span>
                        )}
                        {roommate.gender && (
                            <span className="detail-item">
                                👤 {roommate.gender}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Post Content */}
            <div className="post-content">
                <h4 className="post-title">{roommate.title}</h4>
                <p className="post-description">
                    {roommate.description && roommate.description.length > 120
                        ? `${roommate.description.substring(0, 120)}...`
                        : roommate.description || 'No description provided'
                    }
                </p>
            </div>

            {/* Key Details */}
            <div className="key-details">
                <div className="detail-row">
                    <div className="detail-item">
                        <span className="detail-icon">💰</span>
                        <span className="detail-text">
                            {formatBudget(roommate.budget_min, roommate.budget_max)}
                        </span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-icon">📍</span>
                        <span className="detail-text">
                            {roommate.location || 'Location flexible'}
                        </span>
                    </div>
                </div>
                
                <div className="detail-row">
                    <div className="detail-item">
                        <span className="detail-icon">📅</span>
                        <span className="detail-text">
                            {formatMoveInDate(roommate.move_in_date)}
                        </span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-icon">🏠</span>
                        <span className="detail-text">
                            {roommate.room_type?.replace('_', ' ') || 'Room type flexible'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Preferences Preview */}
            {roommate.preferences && (
                <div className="preferences-preview">
                    <h5>Preferences</h5>
                    <div className="preference-tags">
                        {roommate.preferences.smoking === 'no' && (
                            <span className="preference-tag">🚭 Non-smoker</span>
                        )}
                        {roommate.preferences.pets === 'no_pets' && (
                            <span className="preference-tag">🐕‍🦺 No pets</span>
                        )}
                        {roommate.preferences.student_only && (
                            <span className="preference-tag">🎓 Students only</span>
                        )}
                        {roommate.preferences.gender_preference && 
                         roommate.preferences.gender_preference !== 'no_preference' && (
                            <span className="preference-tag">
                                👥 {roommate.preferences.gender_preference} preferred
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Amenities */}
            {roommate.amenities && roommate.amenities.length > 0 && (
                <div className="amenities-preview">
                    <h5>Desired Amenities</h5>
                    <div className="amenity-tags">
                        {roommate.amenities.slice(0, 4).map(amenity => (
                            <span key={amenity} className="amenity-tag">
                                {amenity.replace('_', ' ')}
                            </span>
                        ))}
                        {roommate.amenities.length > 4 && (
                            <span className="amenity-tag more">
                                +{roommate.amenities.length - 4} more
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Images Preview */}
            {roommate.images && roommate.images.length > 0 && (
                <div className="images-preview">
                    <div className="images-grid">
                        {roommate.images.slice(0, 3).map((image, index) => (
                            <div key={index} className="image-thumb">
                                <img src={image} alt={`Preview ${index + 1}`} />
                            </div>
                        ))}
                        {roommate.images.length > 3 && (
                            <div className="image-thumb more-images">
                                +{roommate.images.length - 3}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Card Footer */}
            <div className="card-footer">
                <div className="post-meta">
                    <span className="post-date">
                        Posted {new Date(roommate.created_at).toLocaleDateString()}
                    </span>
                    {roommate.response_rate && (
                        <span className="response-rate">
                            ⚡ {roommate.response_rate}% response rate
                        </span>
                    )}
                </div>
                
                <div className="card-actions">
                    <Link 
                        to={`/roommates/post/${roommate.id}`}
                        className="btn secondary small"
                    >
                        👁️ View Details
                    </Link>
                    
                    {onContact ? (
                        <button
                            className="btn primary small"
                            onClick={() => onContact(roommate.user_id || roommate.id)}
                        >
                            💬 Contact
                        </button>
                    ) : (
                        <Link
                            to={`/messages/start?user=${roommate.user_id || roommate.id}&context=roommate`}
                            className="btn primary small"
                        >
                            💬 Contact
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}

export default RoommateCard;
