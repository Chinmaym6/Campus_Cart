import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CategoryFilter.css';

function CategoryFilter({ selectedCategory, onCategoryChange, showItemCount = true }) {
    const [categories, setCategories] = useState([]);
    const [categoryCounts, setCategoryCounts] = useState({});
    const [loading, setLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(true);

    useEffect(() => {
        fetchCategories();
        if (showItemCount) {
            fetchCategoryCounts();
        }
    }, [showItemCount]);

    const fetchCategories = async () => {
        try {
            const response = await axios.get('/categories');
            setCategories(response.data.categories || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategoryCounts = async () => {
        try {
            const response = await axios.get('/categories/counts');
            setCategoryCounts(response.data.counts || {});
        } catch (error) {
            console.error('Error fetching category counts:', error);
        }
    };

    const handleCategoryClick = (categorySlug) => {
        if (selectedCategory === categorySlug) {
            onCategoryChange(''); // Deselect if already selected
        } else {
            onCategoryChange(categorySlug);
        }
    };

    const getItemCount = (categorySlug) => {
        return categoryCounts[categorySlug] || 0;
    };

    const getCategoryIcon = (categorySlug) => {
        const icons = {
            'textbooks': '📚',
            'electronics': '💻',
            'furniture': '🪑',
            'clothing': '👕',
            'kitchen-dining': '🍽️',
            'sports-recreation': '⚽',
            'services': '🛠️',
            'other': '📦'
        };
        return icons[categorySlug] || '📦';
    };

    if (loading) {
        return (
            <div className="category-filter loading">
                <div className="filter-header">
                    <h3>Categories</h3>
                </div>
                <div className="loading-skeleton">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="skeleton-item"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="category-filter">
            <div className="filter-header" onClick={() => setIsExpanded(!isExpanded)}>
                <h3>🏷️ Categories</h3>
                <button className="toggle-btn">
                    {isExpanded ? '−' : '+'}
                </button>
            </div>

            {isExpanded && (
                <div className="filter-content">
                    {/* All Categories Option */}
                    <button
                        className={`category-item ${!selectedCategory ? 'active' : ''}`}
                        onClick={() => handleCategoryClick('')}
                    >
                        <span className="category-icon">🌟</span>
                        <span className="category-name">All Categories</span>
                        {showItemCount && (
                            <span className="item-count">
                                {Object.values(categoryCounts).reduce((a, b) => a + b, 0)}
                            </span>
                        )}
                    </button>

                    {/* Individual Categories */}
                    <div className="categories-list">
                        {categories.map(category => (
                            <button
                                key={category.id}
                                className={`category-item ${selectedCategory === category.slug ? 'active' : ''}`}
                                onClick={() => handleCategoryClick(category.slug)}
                            >
                                <span className="category-icon">
                                    {getCategoryIcon(category.slug)}
                                </span>
                                <span className="category-name">{category.name}</span>
                                {showItemCount && (
                                    <span className="item-count">
                                        {getItemCount(category.slug)}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Quick Stats */}
                    {showItemCount && Object.keys(categoryCounts).length > 0 && (
                        <div className="category-stats">
                            <div className="stats-header">📊 Quick Stats</div>
                            <div className="popular-categories">
                                {Object.entries(categoryCounts)
                                    .sort(([,a], [,b]) => b - a)
                                    .slice(0, 3)
                                    .map(([slug, count]) => {
                                        const category = categories.find(c => c.slug === slug);
                                        return category ? (
                                            <div key={slug} className="popular-item">
                                                <span>{getCategoryIcon(slug)}</span>
                                                <span>{category.name}</span>
                                                <span className="count">{count}</span>
                                            </div>
                                        ) : null;
                                    })
                                }
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default CategoryFilter;
