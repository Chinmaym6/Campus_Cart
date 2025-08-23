import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import Toast from '../common/Toast';
import Modal from '../common/Modal';
import axios from 'axios';
import './Reviews.css';

function Reviews() {
    const { user } = useAuth();
    const [reviewsReceived, setReviewsReceived] = useState([]);
    const [reviewsGiven, setReviewsGiven] = useState([]);
    const [activeTab, setActiveTab] = useState('received');
    const [loading, setLoading] = useState(true);
    const [selectedReview, setSelectedReview] = useState(null);
    const [showReplyModal, setShowReplyModal] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

    useEffect(() => {
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        try {
            setLoading(true);
            const [receivedResponse, givenResponse] = await Promise.all([
                axios.get('/reviews/received'),
                axios.get('/reviews/given')
            ]);
            
            setReviewsReceived(receivedResponse.data.reviews || []);
            setReviewsGiven(givenResponse.data.reviews || []);
        } catch (error) {
            console.error('Error fetching reviews:', error);
            showToast('Error loading reviews', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleReplySubmit = async () => {
        if (!selectedReview || !replyText.trim()) return;

        try {
            await axios.post(`/reviews/${selectedReview.id}/reply`, {
                reply: replyText.trim()
            });

            // Update local state
            setReviewsReceived(prev => prev.map(review => 
                review.id === selectedReview.id 
                    ? { ...review, reply: replyText.trim(), reply_date: new Date().toISOString() }
                    : review
            ));

            showToast('Reply posted successfully!', 'success');
            setShowReplyModal(false);
            setReplyText('');
            setSelectedReview(null);
        } catch (error) {
            showToast('Error posting reply', 'error');
        }
    };

    const handleDeleteReview = async (reviewId) => {
        try {
            await axios.delete(`/reviews/${reviewId}`);
            
            // Remove from local state
            setReviewsGiven(prev => prev.filter(review => review.id !== reviewId));
            
            showToast('Review deleted successfully', 'success');
        } catch (error) {
            showToast('Error deleting review', 'error');
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

    const getAverageRating = (reviews) => {
        if (reviews.length === 0) return 0;
        const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
        return (sum / reviews.length).toFixed(1);
    };

    const getRatingDistribution = (reviews) => {
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        reviews.forEach(review => {
            distribution[review.rating]++;
        });
        return distribution;
    };

    const currentReviews = activeTab === 'received' ? reviewsReceived : reviewsGiven;
    const averageRating = getAverageRating(reviewsReceived);
    const ratingDistribution = getRatingDistribution(reviewsReceived);

    return (
        <div className="reviews-page">
            <div className="reviews-container">
                <div className="page-header">
                    <h1>Reviews & Ratings</h1>
                    <p>Manage your feedback and build your reputation</p>
                </div>

                {/* Rating Overview */}
                <div className="rating-overview">
                    <div className="rating-summary">
                        <div className="average-rating">
                            <div className="rating-number">{averageRating}</div>
                            {renderStars(Math.round(averageRating))}
                            <div className="rating-count">
                                Based on {reviewsReceived.length} review{reviewsReceived.length !== 1 ? 's' : ''}
                            </div>
                        </div>
                        
                        <div className="rating-distribution">
                            {[5, 4, 3, 2, 1].map(rating => (
                                <div key={rating} className="distribution-row">
                                    <span className="rating-label">{rating}⭐</span>
                                    <div className="progress-bar">
                                        <div 
                                            className="progress-fill"
                                            style={{ 
                                                width: `${reviewsReceived.length > 0 
                                                    ? (ratingDistribution[rating] / reviewsReceived.length) * 100 
                                                    : 0}%` 
                                            }}
                                        />
                                    </div>
                                    <span className="rating-count">{ratingDistribution[rating]}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="stats-cards">
                        <div className="stat-card">
                            <div className="stat-number">{reviewsReceived.length}</div>
                            <div className="stat-label">Reviews Received</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-number">{reviewsGiven.length}</div>
                            <div className="stat-label">Reviews Given</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-number">
                                {reviewsReceived.filter(r => r.rating >= 4).length}
                            </div>
                            <div className="stat-label">Positive Reviews</div>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="tab-navigation">
                    <button
                        className={`tab-button ${activeTab === 'received' ? 'active' : ''}`}
                        onClick={() => setActiveTab('received')}
                    >
                        Reviews Received ({reviewsReceived.length})
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'given' ? 'active' : ''}`}
                        onClick={() => setActiveTab('given')}
                    >
                        Reviews Given ({reviewsGiven.length})
                    </button>
                </div>

                {/* Reviews List */}
                {loading ? (
                    <LoadingSpinner message="Loading reviews..." />
                ) : currentReviews.length > 0 ? (
                    <div className="reviews-list">
                        {currentReviews.map(review => (
                            <div key={review.id} className="review-card">
                                <div className="review-header">
                                    <div className="reviewer-info">
                                        <div className="reviewer-avatar">
                                            {review.reviewer_avatar ? (
                                                <img src={review.reviewer_avatar} alt="Reviewer" />
                                            ) : (
                                                <span>
                                                    {activeTab === 'received' 
                                                        ? review.reviewer_name?.charAt(0) 
                                                        : review.seller_name?.charAt(0)
                                                    }
                                                </span>
                                            )}
                                        </div>
                                        <div className="reviewer-details">
                                            <div className="reviewer-name">
                                                {activeTab === 'received' 
                                                    ? review.reviewer_name 
                                                    : review.seller_name
                                                }
                                            </div>
                                            <div className="review-date">
                                                {new Date(review.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="review-rating">
                                        {renderStars(review.rating)}
                                    </div>
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

                                    {/* Reply Section (for received reviews) */}
                                    {activeTab === 'received' && (
                                        <div className="reply-section">
                                            {review.reply ? (
                                                <div className="existing-reply">
                                                    <div className="reply-header">
                                                        <strong>Your Reply:</strong>
                                                        <span className="reply-date">
                                                            {new Date(review.reply_date).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <div className="reply-text">"{review.reply}"</div>
                                                </div>
                                            ) : (
                                                <button
                                                    className="reply-button"
                                                    onClick={() => {
                                                        setSelectedReview(review);
                                                        setShowReplyModal(true);
                                                    }}
                                                >
                                                    💬 Reply to Review
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Actions for given reviews */}
                                    {activeTab === 'given' && (
                                        <div className="review-actions">
                                            <button
                                                className="btn danger small"
                                                onClick={() => handleDeleteReview(review.id)}
                                            >
                                                🗑️ Delete Review
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon">⭐</div>
                        <h3>
                            {activeTab === 'received' 
                                ? 'No reviews received yet' 
                                : 'No reviews given yet'
                            }
                        </h3>
                        <p>
                            {activeTab === 'received'
                                ? 'Start selling items to receive reviews from buyers!'
                                : 'Purchase items and leave reviews for sellers!'
                            }
                        </p>
                    </div>
                )}
            </div>

            {/* Reply Modal */}
            <Modal
                isOpen={showReplyModal}
                onClose={() => setShowReplyModal(false)}
                title="Reply to Review"
                size="medium"
            >
                <div className="reply-modal-content">
                    <div className="original-review">
                        <h4>Original Review:</h4>
                        <div className="review-preview">
                            {renderStars(selectedReview?.rating || 0)}
                            <p>"{selectedReview?.comment || 'No comment'}"</p>
                            <small>- {selectedReview?.reviewer_name}</small>
                        </div>
                    </div>

                    <div className="reply-form">
                        <label htmlFor="reply-text">Your Reply:</label>
                        <textarea
                            id="reply-text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Thank you for your feedback..."
                            rows="4"
                            maxLength="300"
                        />
                        <small>{replyText.length}/300 characters</small>
                    </div>

                    <div className="modal-actions">
                        <button 
                            className="btn secondary"
                            onClick={() => setShowReplyModal(false)}
                        >
                            Cancel
                        </button>
                        <button 
                            className="btn primary"
                            onClick={handleReplySubmit}
                            disabled={!replyText.trim()}
                        >
                            Post Reply
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

export default Reviews;
