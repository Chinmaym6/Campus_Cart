import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import Toast from '../common/Toast';
import ItemGrid from '../marketplace/ItemGrid';
import FilterPanel from '../common/FilterPanel';
import axios from 'axios';
import './SavedItems.css';

function SavedItems() {
    const { user } = useAuth();
    const [savedItems, setSavedItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState([]);
    const [filters, setFilters] = useState({});
    const [sortBy, setSortBy] = useState('newest');
    const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

    useEffect(() => {
        fetchSavedItems();
        fetchCategories();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [savedItems, filters, sortBy]);

    const fetchSavedItems = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/items/saved');
            setSavedItems(response.data.items || []);
        } catch (error) {
            console.error('Error fetching saved items:', error);
            showToast('Error loading saved items', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await axios.get('/categories');
            setCategories(response.data.categories || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const applyFilters = () => {
        let filtered = [...savedItems];

        // Apply category filter
        if (filters.category) {
            filtered = filtered.filter(item => item.category_slug === filters.category);
        }

        // Apply price filters
        if (filters.minPrice) {
            filtered = filtered.filter(item => item.price >= parseFloat(filters.minPrice));
        }
        if (filters.maxPrice) {
            filtered = filtered.filter(item => item.price <= parseFloat(filters.maxPrice));
        }

        // Apply condition filter
        if (filters.condition) {
            filtered = filtered.filter(item => item.condition === filters.condition);
        }

        // Apply search filter
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            filtered = filtered.filter(item => 
                item.title.toLowerCase().includes(searchTerm) ||
                item.description.toLowerCase().includes(searchTerm)
            );
        }

        // Apply sorting
        switch (sortBy) {
            case 'price_low':
                filtered.sort((a, b) => a.price - b.price);
                break;
            case 'price_high':
                filtered.sort((a, b) => b.price - a.price);
                break;
            case 'oldest':
                filtered.sort((a, b) => new Date(a.saved_at) - new Date(b.saved_at));
                break;
            default: // newest
                filtered.sort((a, b) => new Date(b.saved_at) - new Date(a.saved_at));
        }

        setFilteredItems(filtered);
    };

    const handleUnsaveItem = async (itemId) => {
        try {
            await axios.delete(`/items/${itemId}/save`);
            
            // Remove from local state
            setSavedItems(prev => prev.filter(item => item.id !== itemId));
            
            showToast('Item removed from saved items', 'success');
        } catch (error) {
            showToast('Error removing item', 'error');
        }
    };

    const handleUnsaveAll = async () => {
        if (!window.confirm('Are you sure you want to remove all saved items?')) {
            return;
        }

        try {
            await axios.delete('/items/saved/all');
            setSavedItems([]);
            showToast('All saved items removed', 'success');
        } catch (error) {
            showToast('Error removing all items', 'error');
        }
    };

    const showToast = (message, type = 'info') => {
        setToast({ show: true, message, type });
    };

    const closeToast = () => {
        setToast({ show: false, message: '', type: 'info' });
    };

    // Get statistics
    const totalValue = savedItems.reduce((sum, item) => sum + item.price, 0);
    const averagePrice = savedItems.length > 0 ? totalValue / savedItems.length : 0;
    const categoryCounts = savedItems.reduce((acc, item) => {
        acc[item.category_name] = (acc[item.category_name] || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="saved-items-page">
            <div className="saved-items-container">
                <div className="page-header">
                    <div className="header-content">
                        <h1>Saved Items</h1>
                        <p>Keep track of items you're interested in</p>
                    </div>
                    <div className="header-actions">
                        {savedItems.length > 0 && (
                            <button 
                                className="btn danger"
                                onClick={handleUnsaveAll}
                            >
                                🗑️ Clear All
                            </button>
                        )}
                        <Link to="/marketplace" className="btn primary">
                            🛍️ Browse More
                        </Link>
                    </div>
                </div>

                {/* Statistics */}
                {savedItems.length > 0 && (
                    <div className="saved-stats">
                        <div className="stat-card">
                            <div className="stat-number">{savedItems.length}</div>
                            <div className="stat-label">Items Saved</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-number">
                                ${totalValue.toLocaleString()}
                            </div>
                            <div className="stat-label">Total Value</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-number">
                                ${Math.round(averagePrice).toLocaleString()}
                            </div>
                            <div className="stat-label">Average Price</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-number">
                                {Object.keys(categoryCounts).length}
                            </div>
                            <div className="stat-label">Categories</div>
                        </div>
                    </div>
                )}

                <div className="saved-content">
                    {/* Filters Sidebar */}
                    {savedItems.length > 0 && (
                        <aside className="filters-sidebar">
                            <FilterPanel 
                                onFilter={setFilters}
                                categories={categories}
                            />
                            
                            {/* Category Breakdown */}
                            <div className="category-breakdown">
                                <h3>Your Saved Categories</h3>
                                <div className="category-list">
                                    {Object.entries(categoryCounts)
                                        .sort(([,a], [,b]) => b - a)
                                        .map(([category, count]) => (
                                            <div key={category} className="category-item">
                                                <span className="category-name">{category}</span>
                                                <span className="category-count">{count}</span>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        </aside>
                    )}

                    {/* Main Content */}
                    <main className="items-section">
                        {savedItems.length > 0 && (
                            <div className="results-header">
                                <div className="results-info">
                                    <h2>Your Saved Items</h2>
                                    <p>{filteredItems.length} of {savedItems.length} items</p>
                                </div>
                                
                                <div className="sort-controls">
                                    <select 
                                        value={sortBy} 
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="sort-select"
                                    >
                                        <option value="newest">Recently Saved</option>
                                        <option value="oldest">Oldest Saved</option>
                                        <option value="price_low">Price: Low to High</option>
                                        <option value="price_high">Price: High to Low</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Items Grid */}
                        <ItemGrid
                            items={filteredItems}
                            loading={loading}
                            emptyMessage="No saved items"
                            emptyDescription="Save items you're interested in to see them here"
                            onUnsave={handleUnsaveItem}
                            savedItems={savedItems.map(item => item.id)}
                        />

                        {/* Quick Actions */}
                        {savedItems.length === 0 && (
                            <div className="quick-actions">
                                <h3>Popular Categories</h3>
                                <div className="category-shortcuts">
                                    {['textbooks', 'electronics', 'furniture', 'clothing'].map(category => (
                                        <Link
                                            key={category}
                                            to={`/marketplace?category=${category}`}
                                            className="category-shortcut"
                                        >
                                            {category.charAt(0).toUpperCase() + category.slice(1)}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </main>
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

export default SavedItems;
