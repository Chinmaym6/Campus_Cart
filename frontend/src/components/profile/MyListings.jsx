import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import Toast from '../common/Toast';
import Modal from '../common/Modal';
import axios from 'axios';
import './MyListings.css';

function MyListings() {
    const { user } = useAuth();
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, active, sold, expired
    const [sortBy, setSortBy] = useState('newest');
    const [selectedListing, setSelectedListing] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

    useEffect(() => {
        fetchListings();
    }, [filter, sortBy]);

    const fetchListings = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filter !== 'all') params.append('status', filter);
            params.append('sortBy', sortBy);

            const response = await axios.get(`/items/my-listings?${params.toString()}`);
            setListings(response.data.items || []);
        } catch (error) {
            console.error('Error fetching listings:', error);
            showToast('Error loading your listings', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (itemId, newStatus) => {
        try {
            await axios.patch(`/items/${itemId}/status`, { status: newStatus });
            
            // Update local state
            setListings(prev => prev.map(item => 
                item.id === itemId ? { ...item, status: newStatus } : item
            ));
            
            showToast(
                `Item marked as ${newStatus === 'sold' ? 'sold' : 'available'}`,
                'success'
            );
        } catch (error) {
            showToast('Error updating item status', 'error');
        }
    };

    const handleDeleteListing = async () => {
        if (!selectedListing) return;

        try {
            await axios.delete(`/items/${selectedListing.id}`);
            
            // Remove from local state
            setListings(prev => prev.filter(item => item.id !== selectedListing.id));
            
            showToast('Listing deleted successfully', 'success');
            setShowDeleteModal(false);
            setSelectedListing(null);
        } catch (error) {
            showToast('Error deleting listing', 'error');
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
            'available': '#10b981',
            'sold': '#f59e0b',
            'expired': '#ef4444',
            'pending': '#6b7280'
        };
        return colors[status] || '#6b7280';
    };

    const filteredListings = listings.filter(item => {
        if (filter === 'all') return true;
        return item.status === filter;
    });

    return (
        <div className="my-listings-page">
            <div className="my-listings-container">
                <div className="page-header">
                    <div className="header-content">
                        <h1>My Listings</h1>
                        <p>Manage your items and track their performance</p>
                    </div>
                    <Link to="/marketplace/create" className="btn primary">
                        📦 Create New Listing
                    </Link>
                </div>

                {/* Stats Overview */}
                <div className="listings-stats">
                    <div className="stat-card">
                        <div className="stat-number">{listings.filter(i => i.status === 'available').length}</div>
                        <div className="stat-label">Active</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">{listings.filter(i => i.status === 'sold').length}</div>
                        <div className="stat-label">Sold</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">{listings.length}</div>
                        <div className="stat-label">Total</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">
                            {formatPrice(listings.filter(i => i.status === 'sold').reduce((sum, item) => sum + item.price, 0))}
                        </div>
                        <div className="stat-label">Total Earned</div>
                    </div>
                </div>

                {/* Filters and Sort */}
                <div className="listings-controls">
                    <div className="filter-tabs">
                        <button
                            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                            onClick={() => setFilter('all')}
                        >
                            All ({listings.length})
                        </button>
                        <button
                            className={`filter-tab ${filter === 'available' ? 'active' : ''}`}
                            onClick={() => setFilter('available')}
                        >
                            Active ({listings.filter(i => i.status === 'available').length})
                        </button>
                        <button
                            className={`filter-tab ${filter === 'sold' ? 'active' : ''}`}
                            onClick={() => setFilter('sold')}
                        >
                            Sold ({listings.filter(i => i.status === 'sold').length})
                        </button>
                    </div>

                    <div className="sort-controls">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="sort-select"
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="price_high">Price: High to Low</option>
                            <option value="price_low">Price: Low to High</option>
                        </select>
                    </div>
                </div>

                {/* Listings Grid */}
                {loading ? (
                    <LoadingSpinner message="Loading your listings..." />
                ) : filteredListings.length > 0 ? (
                    <div className="listings-grid">
                        {filteredListings.map(item => (
                            <div key={item.id} className="listing-card">
                                <div className="listing-image">
                                    {item.images && item.images.length > 0 ? (
                                        <img src={item.images[0]} alt={item.title} />
                                    ) : (
                                        <div className="no-image">📦</div>
                                    )}
                                    <div 
                                        className="status-badge"
                                        style={{ backgroundColor: getStatusColor(item.status) }}
                                    >
                                        {item.status}
                                    </div>
                                </div>

                                <div className="listing-content">
                                    <h3 className="listing-title">{item.title}</h3>
                                    <div className="listing-price">{formatPrice(item.price)}</div>
                                    
                                    <div className="listing-meta">
                                        <span className="listing-date">
                                            📅 {new Date(item.created_at).toLocaleDateString()}
                                        </span>
                                        <span className="listing-views">
                                            👁️ {item.view_count || 0} views
                                        </span>
                                    </div>

                                    <div className="listing-description">
                                        {item.description.length > 80 
                                            ? `${item.description.substring(0, 80)}...`
                                            : item.description
                                        }
                                    </div>
                                </div>

                                <div className="listing-actions">
                                    <div className="action-row">
                                        <Link 
                                            to={`/marketplace/item/${item.id}`}
                                            className="btn secondary small"
                                        >
                                            👁️ View
                                        </Link>
                                        <Link 
                                            to={`/marketplace/edit/${item.id}`}
                                            className="btn primary small"
                                        >
                                            ✏️ Edit
                                        </Link>
                                    </div>

                                    <div className="status-controls">
                                        {item.status === 'available' ? (
                                            <button
                                                className="btn success small"
                                                onClick={() => handleStatusChange(item.id, 'sold')}
                                            >
                                                💰 Mark Sold
                                            </button>
                                        ) : item.status === 'sold' ? (
                                            <button
                                                className="btn secondary small"
                                                onClick={() => handleStatusChange(item.id, 'available')}
                                            >
                                                ↩️ Mark Available
                                            </button>
                                        ) : null}
                                        
                                        <button
                                            className="btn danger small"
                                            onClick={() => {
                                                setSelectedListing(item);
                                                setShowDeleteModal(true);
                                            }}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon">📦</div>
                        <h3>
                            {filter === 'all' 
                                ? 'No listings yet' 
                                : `No ${filter} listings`
                            }
                        </h3>
                        <p>
                            {filter === 'all'
                                ? 'Start selling by creating your first listing!'
                                : `You don't have any ${filter} listings.`
                            }
                        </p>
                        {filter === 'all' && (
                            <Link to="/marketplace/create" className="btn primary">
                                Create Your First Listing
                            </Link>
                        )}
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="Delete Listing"
                size="medium"
            >
                <div className="delete-modal-content">
                    <p>Are you sure you want to delete "{selectedListing?.title}"?</p>
                    <p className="warning-text">
                        ⚠️ This action cannot be undone. The listing will be permanently removed.
                    </p>
                    <div className="modal-actions">
                        <button 
                            className="btn secondary"
                            onClick={() => setShowDeleteModal(false)}
                        >
                            Cancel
                        </button>
                        <button 
                            className="btn danger"
                            onClick={handleDeleteListing}
                        >
                            🗑️ Delete Permanently
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

export default MyListings;
