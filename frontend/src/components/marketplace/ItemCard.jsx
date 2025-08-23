import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import './ItemCard.css';

function ItemCard({ item, onSave, onUnsave, isSaved = false }) {
    const { user } = useAuth();
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(isSaved);

    const handleSaveToggle = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!user) {
            // Redirect to login or show login modal
            window.location.href = '/login';
            return;
        }

        setSaving(true);
        try {
            if (saved) {
                await axios.delete(`/items/${item.id}/save`);
                setSaved(false);
                if (onUnsave) onUnsave(item.id);
            } else {
                await axios.post(`/items/${item.id}/save`);
                setSaved(true);
                if (onSave) onSave(item.id);
            }
        } catch (error) {
            console.error('Error toggling save:', error);
        } finally {
            setSaving(false);
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(price);
    };

    const getConditionColor = (condition) => {
        const colors = {
            new: '#10b981',
            like_new: '#059669',
            good: '#f59e0b',
            fair: '#f97316',
            poor: '#ef4444'
        };
        return colors[condition] || '#6b7280';
    };

    const timeAgo = (dateString) => {
        const now = new Date();
        const posted = new Date(dateString);
        const diffInHours = Math.floor((now - posted) / (1000 * 60 * 60));
        
        if (diffInHours < 1) return 'Just now';
        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
        return `${Math.floor(diffInHours / 168)}w ago`;
    };

    return (
        <Link to={`/marketplace/item/${item.id}`} className="item-card">
            <div className="item-image-container">
                {item.images && item.images.length > 0 ? (
                    <img 
                        src={item.images[0]} 
                        alt={item.title}
                        className="item-image"
                        loading="lazy"
                    />
                ) : (
                    <div className="item-no-image">
                        <span className="no-image-icon">📦</span>
                        <span className="no-image-text">No Image</span>
                    </div>
                )}
                
                {/* Save/Heart Button */}
                <button 
                    className={`save-button ${saved ? 'saved' : ''}`}
                    onClick={handleSaveToggle}
                    disabled={saving}
                    aria-label={saved ? 'Remove from favorites' : 'Add to favorites'}
                >
                    {saving ? '⏳' : saved ? '❤️' : '🤍'}
                </button>

                {/* Condition Badge */}
                <div 
                    className="condition-badge"
                    style={{ backgroundColor: getConditionColor(item.condition) }}
                >
                    {item.condition.replace('_', ' ')}
                </div>

                {/* Multiple Images Indicator */}
                {item.images && item.images.length > 1 && (
                    <div className="image-count">
                        📷 {item.images.length}
                    </div>
                )}
            </div>

            <div className="item-content">
                <div className="item-header">
                    <h3 className="item-title">{item.title}</h3>
                    <div className="item-price">{formatPrice(item.price)}</div>
                </div>

                <p className="item-description">
                    {item.description && item.description.length > 80 
                        ? `${item.description.substring(0, 80)}...` 
                        : item.description || 'No description available'
                    }
                </p>

                <div className="item-meta">
                    <div className="item-seller">
                        <div className="seller-avatar">
                            {item.profile_picture_url ? (
                                <img src={item.profile_picture_url} alt="Seller" />
                            ) : (
                                <span>{item.first_name?.[0]}{item.last_name?.[0]}</span>
                            )}
                        </div>
                        <div className="seller-info">
                            <span className="seller-name">
                                {item.first_name} {item.last_name}
                            </span>
                            <span className="item-location">
                                📍 {item.location_address || 'Campus'}
                            </span>
                        </div>
                    </div>
                    
                    <div className="item-time">
                        {timeAgo(item.created_at)}
                    </div>
                </div>

                {/* Tags/Category */}
                {item.category_name && (
                    <div className="item-tags">
                        <span className="category-tag">{item.category_name}</span>
                    </div>
                )}
            </div>
        </Link>
    );
}

export default ItemCard;
