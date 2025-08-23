import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Toast from '../../components/common/Toast';
import ItemGrid from '../../components/marketplace/ItemGrid';
import FilterPanel from '../../components/common/FilterPanel';
import CategoryFilter from '../../components/marketplace/CategoryFilter';
import PriceFilter from '../../components/marketplace/PriceFilter';
import SearchBar from '../../components/common/SearchBar';
import api from '../../utils/api';
import './index.css';

function MarketplacePage() {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [savedItems, setSavedItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalItems, setTotalItems] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
    
    // Filter states
    const [filters, setFilters] = useState({
        search: searchParams.get('search') || '',
        category: searchParams.get('category') || '',
        minPrice: searchParams.get('minPrice') || '',
        maxPrice: searchParams.get('maxPrice') || '',
        condition: searchParams.get('condition') || '',
        location: searchParams.get('location') || '',
        sortBy: searchParams.get('sortBy') || 'newest'
    });

    const [showMobileFilters, setShowMobileFilters] = useState(false);

    useEffect(() => {
        fetchCategories();
        fetchItems(1, true);
        if (user) {
            fetchSavedItems();
        }
    }, []);

    useEffect(() => {
        const delayedSearch = setTimeout(() => {
            fetchItems(1, true);
            updateURL();
        }, 500);
        
        return () => clearTimeout(delayedSearch);
    }, [filters]);

    const fetchCategories = async () => {
        try {
            const response = await api.get('/categories');
            setCategories(response.data.categories || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchItems = async (page = 1, reset = false) => {
        try {
            setLoading(true);
            
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });
            params.append('page', page);
            params.append('limit', 20);

            const response = await api.get(`/items?${params.toString()}`);
            const newItems = response.data.items || [];
            
            if (reset) {
                setItems(newItems);
                setCurrentPage(1);
            } else {
                setItems(prev => [...prev, ...newItems]);
            }
            
            setTotalItems(response.data.total || 0);
            setHasMore(newItems.length === 20);
            setCurrentPage(page);
            
        } catch (error) {
            console.error('Error fetching items:', error);
            showToast('Error loading items. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchSavedItems = async () => {
        try {
            const response = await api.get('/items/saved');
            setSavedItems((response.data.items || []).map(item => item.id));
        } catch (error) {
            console.error('Error fetching saved items:', error);
        }
    };

    const updateURL = () => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value) params.set(key, value);
        });
        
        const newURL = params.toString() ? `?${params.toString()}` : '';
        navigate(newURL, { replace: true });
    };

    const handleFilterChange = (filterType, value) => {
        setFilters(prev => ({
            ...prev,
            [filterType]: value
        }));
    };

    const handlePriceFilter = (minPrice, maxPrice) => {
        setFilters(prev => ({
            ...prev,
            minPrice: minPrice || '',
            maxPrice: maxPrice || ''
        }));
    };

    const handleSaveItem = async (itemId) => {
        if (!user) {
            navigate('/login');
            return;
        }

        try {
            const isSaved = savedItems.includes(itemId);
            
            if (isSaved) {
                await api.delete(`/items/${itemId}/save`);
                setSavedItems(prev => prev.filter(id => id !== itemId));
                showToast('Item removed from saved items', 'success');
            } else {
                await api.post(`/items/${itemId}/save`);
                setSavedItems(prev => [...prev, itemId]);
                showToast('Item saved to your favorites!', 'success');
            }
        } catch (error) {
            showToast('Error updating saved items', 'error');
        }
    };

    const handleLoadMore = () => {
        if (hasMore && !loading) {
            fetchItems(currentPage + 1, false);
        }
    };

    const clearAllFilters = () => {
        setFilters({
            search: '',
            category: '',
            minPrice: '',
            maxPrice: '',
            condition: '',
            location: '',
            sortBy: 'newest'
        });
    };

    const showToast = (message, type = 'info') => {
        setToast({ show: true, message, type });
    };

    const closeToast = () => {
        setToast({ show: false, message: '', type: 'info' });
    };

    const hasActiveFilters = Object.entries(filters).some(([key, value]) => 
        key !== 'sortBy' && value !== ''
    );

    return (
        <div className="marketplace-page">
            <div className="marketplace-container">
                {/* Header Section */}
                <div className="marketplace-header">
                    <div className="header-content">
                        <h1>Campus Cart Marketplace</h1>
                        <p>Buy and sell items with fellow students</p>
                    </div>
                    
                    <div className="header-actions">
                        <button
                            className="btn secondary mobile-filter-btn"
                            onClick={() => setShowMobileFilters(true)}
                        >
                            🔍 Filters
                        </button>
                        <button
                            className="btn primary"
                            onClick={() => navigate('/marketplace/create')}
                        >
                            📦 Sell Item
                        </button>
                    </div>
                </div>

                {/* Search Section */}
                <div className="search-section">
                    <SearchBar
                        value={filters.search}
                        onChange={(value) => handleFilterChange('search', value)}
                        placeholder="Search for items..."
                        suggestions={[
                            'textbooks', 'laptop', 'furniture', 'bicycle',
                            'calculator', 'dorm decor', 'electronics'
                        ]}
                    />
                    
                    {hasActiveFilters && (
                        <button 
                            className="clear-filters-btn"
                            onClick={clearAllFilters}
                        >
                            🗑️ Clear Filters
                        </button>
                    )}
                </div>

                {/* Results Summary */}
                <div className="results-summary">
                    <div className="results-count">
                        {totalItems > 0 ? (
                            <>
                                <span className="count-number">{totalItems.toLocaleString()}</span>
                                <span className="count-text">
                                    item{totalItems !== 1 ? 's' : ''} found
                                </span>
                            </>
                        ) : loading ? (
                            <span>Searching...</span>
                        ) : (
                            <span>No items found</span>
                        )}
                    </div>
                    
                    <div className="sort-controls">
                        <select
                            value={filters.sortBy}
                            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                            className="sort-select"
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="price_low">Price: Low to High</option>
                            <option value="price_high">Price: High to Low</option>
                            <option value="popular">Most Popular</option>
                        </select>
                    </div>
                </div>

                {/* Main Content */}
                <div className="marketplace-content">
                    {/* Sidebar Filters */}
                    <aside className={`filters-sidebar ${showMobileFilters ? 'mobile-open' : ''}`}>
                        <div className="sidebar-header">
                            <h3>🔍 Refine Search</h3>
                            <button
                                className="close-mobile-filters"
                                onClick={() => setShowMobileFilters(false)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="filter-sections">
                            <CategoryFilter
                                selectedCategory={filters.category}
                                onCategoryChange={(category) => handleFilterChange('category', category)}
                                showItemCount={true}
                            />

                            <PriceFilter
                                minPrice={filters.minPrice}
                                maxPrice={filters.maxPrice}
                                onPriceChange={handlePriceFilter}
                                showPresets={true}
                            />

                            <div className="condition-filter">
                                <h4>Condition</h4>
                                <div className="condition-options">
                                    {['new', 'like_new', 'good', 'fair', 'poor'].map(condition => (
                                        <button
                                            key={condition}
                                            className={`condition-btn ${filters.condition === condition ? 'active' : ''}`}
                                            onClick={() => handleFilterChange('condition', 
                                                filters.condition === condition ? '' : condition
                                            )}
                                        >
                                            {condition.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="location-filter">
                                <h4>Location</h4>
                                <select
                                    value={filters.location}
                                    onChange={(e) => handleFilterChange('location', e.target.value)}
                                    className="location-select"
                                >
                                    <option value="">All Locations</option>
                                    <option value="on_campus">On Campus</option>
                                    <option value="north_campus">North Campus</option>
                                    <option value="south_campus">South Campus</option>
                                    <option value="downtown">Downtown</option>
                                    <option value="off_campus">Off Campus</option>
                                </select>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="marketplace-stats">
                            <h4>📊 Marketplace Stats</h4>
                            <div className="stats-list">
                                <div className="stat-item">
                                    <span className="stat-label">Total Items:</span>
                                    <span className="stat-value">{totalItems}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Categories:</span>
                                    <span className="stat-value">{categories.length}</span>
                                </div>
                                {user && (
                                    <div className="stat-item">
                                        <span className="stat-label">Your Saved:</span>
                                        <span className="stat-value">{savedItems.length}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </aside>

                    {/* Items Grid */}
                    <main className="items-section">
                        <ItemGrid
                            items={items}
                            loading={loading && currentPage === 1}
                            savedItems={savedItems}
                            onSave={handleSaveItem}
                            emptyMessage="No items found matching your criteria"
                            emptyDescription="Try adjusting your filters or search terms"
                        />

                        {/* Load More */}
                        {hasMore && items.length > 0 && (
                            <div className="load-more-section">
                                <button
                                    className="load-more-btn"
                                    onClick={handleLoadMore}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <LoadingSpinner size="small" />
                                            Loading...
                                        </>
                                    ) : (
                                        `📦 Load More Items (${Math.min(20, totalItems - items.length)} more)`
                                    )}
                                </button>
                            </div>
                        )}

                        {/* Pagination Info */}
                        {items.length > 0 && (
                            <div className="pagination-info">
                                Showing {items.length} of {totalItems.toLocaleString()} items
                            </div>
                        )}
                    </main>
                </div>

                {/* Featured Categories */}
                {!hasActiveFilters && items.length === 0 && !loading && (
                    <div className="featured-categories">
                        <h3>🌟 Popular Categories</h3>
                        <div className="category-grid">
                            {categories.slice(0, 6).map(category => (
                                <button
                                    key={category.id}
                                    className="category-card"
                                    onClick={() => handleFilterChange('category', category.slug)}
                                >
                                    <span className="category-icon">{category.icon || '📦'}</span>
                                    <span className="category-name">{category.name}</span>
                                    <span className="category-count">{category.item_count || 0} items</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile Filter Overlay */}
            {showMobileFilters && (
                <div 
                    className="mobile-filter-overlay"
                    onClick={() => setShowMobileFilters(false)}
                />
            )}

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

export default MarketplacePage;
