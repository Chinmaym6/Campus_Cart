import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import Toast from '../common/Toast';
import Modal from '../common/Modal';
import api from '../../utils/api';
import './ItemDetails.css';

function ItemDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [item, setItem] = useState(null);
    const [seller, setSeller] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [saved, setSaved] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

    useEffect(() => {
        fetchItemDetails();
        if (user) {
            checkIfSaved();
        }
    }, [id, user]);

    const fetchItemDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/items/${id}`);
            setItem(response.data.item);
            setSeller(response.data.seller);
        } catch (error) {
            console.error('Error fetching item:', error);
            if (error.response?.status === 404) {
                navigate('/marketplace');
            }
        } finally {
            setLoading(false);
        }
    };

    const checkIfSaved = async () => {
        try {
            const response = await api.get(`/items/${id}/saved`);
            setSaved(response.data.saved);
        } catch (error) {
            console.error('Error checking saved status:', error);
        }
    };

    const handleSaveToggle = async () => {
        if (!user) {
            navigate('/login');
            return;
        }

        try {
            if (saved) {
                await api.delete(`/items/${id}/save`);
                setSaved(false);
                showToast('Removed from saved items', 'success');
            } else {
                await api.post(`/items/${id}/save`);
                setSaved(true);
                showToast('Added to saved items', 'success');
            }
        } catch (error) {
            showToast('Error updating saved status', 'error');
        }
    };

    const handleContactSeller = () => {
        if (!user) {
            navigate('/login');
            return;
        }
        setShowContactModal(true);
    };

    const handleStartChat = async () => {
        try {
            const response = await api.post('/messages/start-chat', {
                recipientId: seller.id,
                itemId: item.id
            });
            navigate(`/messages/${response.data.chatId}`);
        } catch (error) {
            showToast('Error starting chat', 'error');
        }
    };

    const handleReport = async (reason) => {
        try {
            await api.post(`/items/${id}/report`, { reason });
            setShowReportModal(false);
            showToast('Item reported. We\'ll review it shortly.', 'success');
        } catch (error) {
            showToast('Error reporting item', 'error');
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

    const getConditionInfo = (condition) => {
        const conditions = {
            new: { label: 'New', color: '#10b981', description: 'Brand new, never used' },
            like_new: { label: 'Like New', color: '#059669', description: 'Barely used, excellent condition' },
            good: { label: 'Good', color: '#f59e0b', description: 'Used but in good condition' },
            fair: { label: 'Fair', color: '#f97316', description: 'Shows signs of wear' },
            poor: { label: 'Poor', color: '#ef4444', description: 'Heavily used' }
        };
        return conditions[condition] || conditions.good;
    };

    if (loading) {
        return <LoadingSpinner message="Loading item details..." overlay />;
    }

    if (!item) {
        return (
            <div className="item-not-found">
                <h2>Item Not Found</h2>
                <p>The item you're looking for doesn't exist or has been removed.</p>
                <Link to="/marketplace" className="btn primary">
                    Back to Marketplace
                </Link>
            </div>
        );
    }

    const conditionInfo = getConditionInfo(item.condition);
    const isOwnItem = user && user.id === item.seller_id;

    return (
        <div className="item-details-page">
            <div className="item-details-container">
                {/* Breadcrumb */}
                <nav className="breadcrumb">
                    <Link to="/marketplace">Marketplace</Link>
                    <span className="separator">›</span>
                    <Link to={`/marketplace?category=${item.category_slug}`}>
                        {item.category_name}
                    </Link>
                    <span className="separator">›</span>
                    <span className="current">{item.title}</span>
                </nav>

                <div className="item-details-content">
                    {/* Image Gallery */}
                    <div className="image-gallery">
                        <div className="main-image">
                            {item.images && item.images.length > 0 ? (
                                <img 
                                    src={item.images[currentImageIndex]} 
                                    alt={item.title}
                                    className="main-img"
                                />
                            ) : (
                                <div className="no-image-large">
                                    <span className="no-image-icon">📦</span>
                                    <span>No Image Available</span>
                                </div>
                            )}
                        </div>
                        
                        {item.images && item.images.length > 1 && (
                            <div className="image-thumbnails">
                                {item.images.map((image, index) => (
                                    <button
                                        key={index}
                                        className={`thumbnail ${index === currentImageIndex ? 'active' : ''}`}
                                        onClick={() => setCurrentImageIndex(index)}
                                    >
                                        <img src={image} alt={`${item.title} ${index + 1}`} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Item Info */}
                    <div className="item-info">
                        <div className="item-header">
                            <h1 className="item-title">{item.title}</h1>
                            <div className="item-actions">
                                <button 
                                    className={`save-btn ${saved ? 'saved' : ''}`}
                                    onClick={handleSaveToggle}
                                >
                                    {saved ? '❤️' : '🤍'}
                                </button>
                                <button 
                                    className="share-btn"
                                    onClick={() => navigator.share ? navigator.share({
                                        title: item.title,
                                        url: window.location.href
                                    }) : navigator.clipboard.writeText(window.location.href)}
                                >
                                    📤
                                </button>
                            </div>
                        </div>

                        <div className="price-section">
                            <div className="price">{formatPrice(item.price)}</div>
                            {item.is_negotiable && (
                                <span className="negotiable-badge">Negotiable</span>
                            )}
                        </div>

                        <div className="item-meta">
                            <div className="meta-item">
                                <span className="meta-label">Condition:</span>
                                <span 
                                    className="condition-value"
                                    style={{ color: conditionInfo.color }}
                                >
                                    {conditionInfo.label}
                                </span>
                            </div>
                            <div className="meta-item">
                                <span className="meta-label">Category:</span>
                                <Link 
                                    to={`/marketplace?category=${item.category_slug}`}
                                    className="category-link"
                                >
                                    {item.category_name}
                                </Link>
                            </div>
                            <div className="meta-item">
                                <span className="meta-label">Location:</span>
                                <span>📍 {item.location_address || 'Campus'}</span>
                            </div>
                            <div className="meta-item">
                                <span className="meta-label">Posted:</span>
                                <span>{new Date(item.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>

                        <div className="description-section">
                            <h3>Description</h3>
                            <p className="description">
                                {item.description || 'No description provided.'}
                            </p>
                        </div>

                        {/* Seller Info */}
                        <div className="seller-section">
                            <h3>Seller Information</h3>
                            <div className="seller-card">
                                <div className="seller-avatar">
                                    {seller?.profile_picture_url ? (
                                        <img src={seller.profile_picture_url} alt="Seller" />
                                    ) : (
                                        <span>{seller?.first_name?.[0]}{seller?.last_name?.[0]}</span>
                                    )}
                                </div>
                                <div className="seller-info">
                                    <div className="seller-name">
                                        {seller?.first_name} {seller?.last_name}
                                    </div>
                                    <div className="seller-stats">
                                        ⭐ 4.8 rating • 23 items sold
                                    </div>
                                    <div className="seller-joined">
                                        Member since {new Date(seller?.created_at).getFullYear()}
                                    </div>
                                </div>
                                <Link to={`/profile/${seller?.id}`} className="view-profile-btn">
                                    View Profile
                                </Link>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="action-buttons">
                            {isOwnItem ? (
                                <div className="owner-actions">
                                    <Link to={`/marketplace/edit/${item.id}`} className="btn secondary">
                                        ✏️ Edit Listing
                                    </Link>
                                    <button className="btn danger">
                                        🗑️ Delete Listing
                                    </button>
                                </div>
                            ) : (
                                <div className="buyer-actions">
                                    <button 
                                        className="btn primary large"
                                        onClick={handleContactSeller}
                                    >
                                        💬 Contact Seller
                                    </button>
                                    <button 
                                        className="btn secondary"
                                        onClick={() => setShowReportModal(true)}
                                    >
                                        🚩 Report
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Contact Modal */}
            <Modal
                isOpen={showContactModal}
                onClose={() => setShowContactModal(false)}
                title="Contact Seller"
                size="medium"
            >
                <div className="contact-modal-content">
                    <p>How would you like to contact {seller?.first_name}?</p>
                    <div className="contact-options">
                        <button 
                            className="btn primary full-width"
                            onClick={handleStartChat}
                        >
                            💬 Start Chat
                        </button>
                        <p className="contact-note">
                            Start a secure chat to discuss details, arrange meetup, and negotiate price.
                        </p>
                    </div>
                </div>
            </Modal>

            {/* Report Modal */}
            <Modal
                isOpen={showReportModal}
                onClose={() => setShowReportModal(false)}
                title="Report Item"
                size="medium"
            >
                <div className="report-modal-content">
                    <p>Why are you reporting this item?</p>
                    <div className="report-reasons">
                        <button 
                            className="reason-btn"
                            onClick={() => handleReport('inappropriate_content')}
                        >
                            Inappropriate Content
                        </button>
                        <button 
                            className="reason-btn"
                            onClick={() => handleReport('spam')}
                        >
                            Spam or Misleading
                        </button>
                        <button 
                            className="reason-btn"
                            onClick={() => handleReport('scam')}
                        >
                            Suspicious/Scam
                        </button>
                        <button 
                            className="reason-btn"
                            onClick={() => handleReport('other')}
                        >
                            Other
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

export default ItemDetails;
