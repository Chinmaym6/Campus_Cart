import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Toast from '../../components/common/Toast';
import ItemGrid from '../../components/marketplace/ItemGrid';
import PriceFilter from '../../components/marketplace/PriceFilter';
import SearchBar from '../../components/common/SearchBar';
import api from '../../utils/api';
import './Category.css';

function CategoryPage() {
    const { category } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    
    const [categoryData, setCategoryData] = useState(null);
    const [items, setItems] = useState([]);
    const [savedItems, setSavedItems] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalItems, setTotalItems] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
    
    // Filter states
    const [filters, setFilters] = useState({
        search: searchParams.get('search') || '',
        subcategory: searchParams.get('subcategory') || '',
        minPrice: searchParams.get('minPrice') || '',
        maxPrice: searchParams.get('maxPrice') || '',
        condition: searchParams.get('condition') || '',
        location: searchParams.get('location') || '',
        sortBy: searchParams.get('sortBy') || 'newest'
    });

    const [showMobileFilters, setShowMobileFilters] = useState(false);

    useEffect(() => {
        if (category) {
            fetchCategoryData();
            fetchItems(1, true);
            if (user) {
                fetchSavedItems();
            }
        }
    }, [category]);

    useEffect(() => {
        const delayedSearch = setTimeout(() => {
            fetchItems(1, true);
            updateURL();
        }, 500);
        
        return () => clearTimeout(delayedSearch);
    }, [filters]);

    const fetchCategoryData = async () => {
        try {
            const response = await api.get(`/categories/${category}`);
            const catData = response.data.category;
            
            if (!catData) {
                navigate('/marketplace');
                return;
            }
            
            setCategoryData(catData);
            setSubcategories(response.data.subcategories || []);
        } catch (error) {
            console.error('Error fetching category:', error);
            if (error.response?.status === 404) {
                navigate('/marketplace');
            } else {
                showToast('Error loading category', 'error');
            }
        }
    };

    const fetchItems = async (page = 1, reset = false) => {
        try {
            setLoading(true);
            
            const params = new URLSearchParams();
            params.append('category', category);
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
        navigate(`/marketplace/category/${category}${newURL}`, { replace: true });
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
            subcategory: '',
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

    if (!categoryData) {
        return <LoadingSpinner message="Loading category..." overlay />;
    }

    return (
        <>
            <Helmet>
                <title>{categoryData.name} - Campus Cart Marketplace</title>
                <meta name="description" content={`Shop ${categoryData.name.toLowerCase()} items on Campus Cart. ${categoryData.description || 'Find great deals from fellow students.'}`} />
            </Helmet>

            <div className="category-page">
                <div className="category-container">
                    {/* Breadcrumb */}
                    <nav className="category-breadcrumb">
                        <a href="/marketplace">Marketplace</a>
                        <span className="separator">›</span>
                        <span className="current">{categoryData.name}</span>
                        {filters.subcategory && (
                            <>
                                <span className="separator">›</span>
                                <span className="current">
                                    {subcategories.find(sub => sub.slug === filters.subcategory)?.name || filters.subcategory}
                                </span>
                            </>
                        )}
                    </nav>

                    {/* Category Header */}
                    <div className="category-header">
                        <div className="category-hero">
                            <div className="category-icon">
                                {categoryData.icon || '📦'}
                            </div>
                            <div className="category-content">
                                <h1>{categoryData.name}</h1>
                                {categoryData.description && (
                                    <p className="category-description">{categoryData.description}</p>
                                )}
                                <div className="category-stats">
                                    <span className="stat-item">
                                        📦 {totalItems.toLocaleString()} items
                                    </span>
                                    <span className="stat-item">
                                        🔥 Popular category
                                    </span>
                                    {subcategories.length > 0 && (
                                        <span className="stat-item">
                                            🏷️ {subcategories.length} subcategories
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className="category-actions">
                            <button
                                className="btn secondary mobile-filter-btn"
                                onClick={() => setShowMobileFilters(true)}
                            >
                                🔍 Filters
                            </button>
                            <button
                                className="btn primary"
                                onClick={() => navigate(`/marketplace/create?category=${category}`)}
                            >
                                📦 Sell in {categoryData.name}
                            </button>
                        </div>
                    </div>

                    {/* Search Section */}
                    <div className="category-search">
                        <SearchBar
                            value={filters.search}
                            onChange={(value) => handleFilterChange('search', value)}
                            placeholder={`Search in ${categoryData.name}...`}
                            suggestions={categoryData.popular_searches || []}
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

                    {/* Subcategories */}
                    {subcategories.length > 0 && (
                        <div className="subcategories-section">
                            <h3>Browse by Type</h3>
                            <div className="subcategories-grid">
                                <button
                                    className={`subcategory-btn ${!filters.subcategory ? 'active' : ''}`}
                                    onClick={() => handleFilterChange('subcategory', '')}
                                >
                                    <span className="subcategory-icon">📋</span>
                                    <span className="subcategory-name">All {categoryData.name}</span>
                                    <span className="subcategory-count">{totalItems}</span>
                                </button>
                                
                                {subcategories.map(subcategory => (
                                    <button
                                        key={subcategory.id}
                                        className={`subcategory-btn ${filters.subcategory === subcategory.slug ? 'active' : ''}`}
                                        onClick={() => handleFilterChange('subcategory', 
                                            filters.subcategory === subcategory.slug ? '' : subcategory.slug
                                        )}
                                    >
                                        <span className="subcategory-icon">
                                            {subcategory.icon || '🏷️'}
                                        </span>
                                        <span className="subcategory-name">{subcategory.name}</span>
                                        <span className="subcategory-count">
                                            {subcategory.item_count || 0}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Results Summary */}
                    <div className="results-summary">
                        <div className="results-count">
                            {totalItems > 0 ? (
                                <>
                                    <span className="count-number">{totalItems.toLocaleString()}</span>
                                    <span className="count-text">
                                        item{totalItems !== 1 ? 's' : ''} in {categoryData.name}
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
                    <div className="category-content">
                        {/* Sidebar Filters */}
                        <aside className={`filters-sidebar ${showMobileFilters ? 'mobile-open' : ''}`}>
                            <div className="sidebar-header">
                                <h3>🔍 Filter Results</h3>
                                <button
                                    className="close-mobile-filters"
                                    onClick={() => setShowMobileFilters(false)}
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="filter-sections">
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

                            {/* Category Stats */}
                            <div className="category-sidebar-stats">
                                <h4>📊 Category Stats</h4>
                                <div className="stats-list">
                                    <div className="stat-item">
                                        <span className="stat-label">Total Items:</span>
                                        <span className="stat-value">{totalItems}</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Avg. Price:</span>
                                        <span className="stat-value">
                                            ${categoryData.average_price || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">New Today:</span>
                                        <span className="stat-value">
                                            {categoryData.items_today || 0}
                                        </span>
                                    </div>
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
                                emptyMessage={`No ${categoryData.name.toLowerCase()} items found`}
                                emptyDescription="Try adjusting your filters or check back later for new listings"
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
                                    Showing {items.length} of {totalItems.toLocaleString()} {categoryData.name.toLowerCase()} items
                                </div>
                            )}
                        </main>
                    </div>

                    {/* Category Tips */}
                    {!hasActiveFilters && items.length === 0 && !loading && (
                        <div className="category-tips">
                            <h3>💡 Tips for {categoryData.name}</h3>
                            <div className="tips-grid">
                                <div className="tip-card">
                                    <div className="tip-icon">🔍</div>
                                    <div className="tip-content">
                                        <h4>Use specific keywords</h4>
                                        <p>Search for brand names, models, or specific features</p>
                                    </div>
                                </div>
                                <div className="tip-card">
                                    <div className="tip-icon">💰</div>
                                    <div className="tip-content">
                                        <h4>Set price alerts</h4>
                                        <p>Get notified when items in your price range are listed</p>
                                    </div>
                                </div>
                                <div className="tip-card">
                                    <div className="tip-icon">📅</div>
                                    <div className="tip-content">
                                        <h4>Check regularly</h4>
                                        <p>New {categoryData.name.toLowerCase()} items are posted daily</p>
                                    </div>
                                </div>
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
        </>
    );
}

export default CategoryPage;
