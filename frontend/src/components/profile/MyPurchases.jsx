import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import Toast from '../common/Toast';
import Modal from '../common/Modal';
import api from '../../utils/api';
import './MyPurchases.css';

function MyPurchases() {
    const { user } = useAuth();
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, completed, pending, cancelled
    const [selectedPurchase, setSelectedPurchase] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewData, setReviewData] = useState({ rating: 5, comment: '' });
    const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

    useEffect(() => {
        fetchPurchases();
    }, [filter]);

    const fetchPurchases = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filter !== 'all') params.append('status', filter);

            const response = await api.get(`/purchases?${params.toString()}`);
            setPurchases(response.data.purchases || []);
        } catch (error) {
            console.error('Error fetching purchases:', error);
            showToast('Error loading your purchases', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleReviewSubmit = async () => {
        if (!selectedPurchase) return;

        try {
            await api.post(`/reviews`, {
                item_id: selectedPurchase.item_id,
                seller_id: selectedPurchase.seller_id,
                rating: reviewData.rating,
                comment: reviewData.comment
            });

            // Update local state
            setPurchases(prev => prev.map(purchase => 
                purchase.id === selectedPurchase.id 
                    ? { ...purchase, has_reviewed: true }
                    : purchase
            ));

            showToast('Review submitted successfully!', 'success');
            setShowReviewModal(false);
            setReviewData({ rating: 5, comment: '' });
        } catch (error) {
            showToast('Error submitting review', 'error');
        }
    };

    const handleContactSeller = async (sellerId, itemId) => {
        try {
            const response = await api.post('/messages/start-chat', {
                recipientId: sellerId,
                itemId: itemId
            });
            
            // Navigate to chat
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

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(price);
    };

    const getStatusColor = (status) => {
        const colors = {
            'completed': '#10b981',
            'pending': '#f59e0b',
            'cancelled': '#ef4444',
            'refunded': '#6b7280'
        };
        return colors[status] || '#6b7280';
    };

    const filteredPurchases = purchases.filter(purchase => {
        if (filter === 'all') return true;
        return purchase.status === filter;
    });

    const totalSpent = purchases
        .filter(p => p.status === 'completed')
        .reduce((sum, purchase) => sum + purchase.total_amount, 0);

    return (
        <div className="my-purchases-page">
            <div className="my-purchases-container">
                <div className="page-header">
                    <div className="header-content">
                        <h1>My Purchases</h1>
                        <p>Track your orders and purchase history</p>
                    </div>
                    <Link to="/marketplace" className="btn primary">
                        🛍️ Browse More Items
                    </Link>
                </div>

                {/* Stats Overview */}
                <div className="purchases-stats">
                    <div className="stat-card">
                        <div className="stat-number">{purchases.filter(p => p.status === 'completed').length}</div>
                        <div className="stat-label">Completed</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">{purchases.filter(p => p.status === 'pending').length}</div>
                        <div className="stat-label">Pending</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">{purchases.length}</div>
                        <div className="stat-label">Total Orders</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">{formatPrice(totalSpent)}</div>
                        <div className="stat-label">Total Spent</div>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="filter-tabs">
                    <button
                        className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        All ({purchases.length})
                    </button>
                    <button
                        className={`filter-tab ${filter === 'completed' ? 'active' : ''}`}
                        onClick={() => setFilter('completed')}
                    >
                        Completed ({purchases.filter(p => p.status === 'completed').length})
                    </button>
                    <button
                        className={`filter-tab ${filter === 'pending' ? 'active' : ''}`}
                        onClick={() => setFilter('pending')}
                    >
                        Pending ({purchases.filter(p => p.status === 'pending').length})
                    </button>
                </div>

                {/* Purchases List */}
                {loading ? (
                    <LoadingSpinner message="Loading your purchases..." />
                ) : filteredPurchases.length > 0 ? (
                    <div className="purchases-list">
                        {filteredPurchases.map(purchase => (
                            <div key={purchase.id} className="purchase-card">
                                <div className="purchase-image">
                                    {purchase.item_images && purchase.item_images.length > 0 ? (
                                        <img src={purchase.item_images[0]} alt={purchase.item_title} />
                                    ) : (
                                        <div className="no-image">📦</div>
                                    )}
                                </div>

                                <div className="purchase-details">
                                    <div className="purchase-header">
                                        <h3 className="item-title">{purchase.item_title}</h3>
                                        <div 
                                            className="status-badge"
                                            style={{ backgroundColor: getStatusColor(purchase.status) }}
                                        >
                                            {purchase.status}
                                        </div>
                                    </div>

                                    <div className="purchase-meta">
                                        <div className="meta-item">
                                            <span className="label">Price:</span>
                                            <span className="value">{formatPrice(purchase.total_amount)}</span>
                                        </div>
                                        <div className="meta-item">
                                            <span className="label">Seller:</span>
                                            <span className="value">{purchase.seller_name}</span>
                                        </div>
                                        <div className="meta-item">
                                            <span className="label">Date:</span>
                                            <span className="value">
                                                {new Date(purchase.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="meta-item">
                                            <span className="label">Order ID:</span>
                                            <span className="value">#{purchase.id.slice(-8)}</span>
                                        </div>
                                    </div>

                                    {purchase.notes && (
                                        <div className="purchase-notes">
                                            <strong>Notes:</strong> {purchase.notes}
                                        </div>
                                    )}
                                </div>

                                <div className="purchase-actions">
                                    <button
                                        className="btn secondary small"
                                        onClick={() => {
                                            setSelectedPurchase(purchase);
                                            setShowDetailsModal(true);
                                        }}
                                    >
                                        📋 Details
                                    </button>

                                    {purchase.status === 'completed' && !purchase.has_reviewed && (
                                        <button
                                            className="btn primary small"
                                            onClick={() => {
                                                setSelectedPurchase(purchase);
                                                setShowReviewModal(true);
                                            }}
                                        >
                                            ⭐ Review
                                        </button>
                                    )}

                                    <button
                                        className="btn secondary small"
                                        onClick={() => handleContactSeller(purchase.seller_id, purchase.item_id)}
                                    >
                                        💬 Contact
                                    </button>

                                    {purchase.item_status === 'available' && (
                                        <Link
                                            to={`/marketplace/item/${purchase.item_id}`}
                                            className="btn outline small"
                                        >
                                            👁️ View Item
                                        </Link>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon">🛍️</div>
                        <h3>
                            {filter === 'all' 
                                ? 'No purchases yet' 
                                : `No ${filter} purchases`
                            }
                        </h3>
                        <p>
                            {filter === 'all'
                                ? 'Start shopping to see your orders here!'
                                : `You don't have any ${filter} purchases.`
                            }
                        </p>
                        {filter === 'all' && (
                            <Link to="/marketplace" className="btn primary">
                                Start Shopping
                            </Link>
                        )}
                    </div>
                )}
            </div>

            {/* Purchase Details Modal */}
            <Modal
                isOpen={showDetailsModal}
                onClose={() => setShowDetailsModal(false)}
                title="Purchase Details"
                size="large"
            >
                {selectedPurchase && (
                    <div className="purchase-details-modal">
                        <div className="detail-section">
                            <h4>Order Information</h4>
                            <div className="detail-grid">
                                <div className="detail-item">
                                    <label>Order ID:</label>
                                    <span>#{selectedPurchase.id}</span>
                                </div>
                                <div className="detail-item">
                                    <label>Status:</label>
                                    <span className="status-text" style={{ color: getStatusColor(selectedPurchase.status) }}>
                                        {selectedPurchase.status}
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <label>Total Amount:</label>
                                    <span>{formatPrice(selectedPurchase.total_amount)}</span>
                                </div>
                                <div className="detail-item">
                                    <label>Purchase Date:</label>
                                    <span>{new Date(selectedPurchase.created_at).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="detail-section">
                            <h4>Item Information</h4>
                            <div className="item-info">
                                <h5>{selectedPurchase.item_title}</h5>
                                <p>{selectedPurchase.item_description}</p>
                            </div>
                        </div>

                        <div className="detail-section">
                            <h4>Seller Information</h4>
                            <div className="seller-info">
                                <span>{selectedPurchase.seller_name}</span>
                                <span>{selectedPurchase.seller_email}</span>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Review Modal */}
            <Modal
                isOpen={showReviewModal}
                onClose={() => setShowReviewModal(false)}
                title="Write a Review"
                size="medium"
            >
                <div className="review-modal-content">
                    <div className="review-item-info">
                        <h4>{selectedPurchase?.item_title}</h4>
                        <p>How was your experience with this item and seller?</p>
                    </div>

                    <div className="rating-section">
                        <label>Rating:</label>
                        <div className="star-rating">
                            {[1, 2, 3, 4, 5].map(star => (
                                <button
                                    key={star}
                                    className={`star ${star <= reviewData.rating ? 'active' : ''}`}
                                    onClick={() => setReviewData(prev => ({ ...prev, rating: star }))}
                                >
                                    ⭐
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="comment-section">
                        <label htmlFor="review-comment">Comment (optional):</label>
                        <textarea
                            id="review-comment"
                            value={reviewData.comment}
                            onChange={(e) => setReviewData(prev => ({ ...prev, comment: e.target.value }))}
                            placeholder="Share your experience..."
                            rows="4"
                            maxLength="500"
                        />
                        <small>{reviewData.comment.length}/500 characters</small>
                    </div>

                    <div className="modal-actions">
                        <button 
                            className="btn secondary"
                            onClick={() => setShowReviewModal(false)}
                        >
                            Cancel
                        </button>
                        <button 
                            className="btn primary"
                            onClick={handleReviewSubmit}
                        >
                            Submit Review
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

export default MyPurchases;
