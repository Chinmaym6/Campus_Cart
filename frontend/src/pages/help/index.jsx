import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import SearchBar from '../../components/common/SearchBar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import axios from 'axios';
import './index.css';

function HelpPage() {
    const navigate = useNavigate();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [popularArticles, setPopularArticles] = useState([]);
    const [recentArticles, setRecentArticles] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        fetchHelpData();
    }, []);

    useEffect(() => {
        if (searchQuery.length > 2) {
            const delayedSearch = setTimeout(() => {
                performSearch();
            }, 300);
            return () => clearTimeout(delayedSearch);
        } else {
            setSearchResults([]);
            setIsSearching(false);
        }
    }, [searchQuery]);

    const fetchHelpData = async () => {
        try {
            setLoading(true);
            
            const [categoriesRes, popularRes, recentRes] = await Promise.all([
                axios.get('/help/categories'),
                axios.get('/help/articles/popular'),
                axios.get('/help/articles/recent')
            ]);
            
            setCategories(categoriesRes.data.categories || defaultCategories);
            setPopularArticles(popularRes.data.articles || defaultPopularArticles);
            setRecentArticles(recentRes.data.articles || defaultRecentArticles);
            
        } catch (error) {
            console.error('Error fetching help data:', error);
            // Use default data if API fails
            setCategories(defaultCategories);
            setPopularArticles(defaultPopularArticles);
            setRecentArticles(defaultRecentArticles);
        } finally {
            setLoading(false);
        }
    };

    const performSearch = async () => {
        if (!searchQuery.trim()) return;
        
        try {
            setIsSearching(true);
            const response = await axios.get(`/help/search?q=${encodeURIComponent(searchQuery)}`);
            setSearchResults(response.data.results || []);
        } catch (error) {
            console.error('Error searching help articles:', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleCategoryClick = (categorySlug) => {
        navigate(`/help/${categorySlug}`);
    };

    const handleArticleClick = (articleId) => {
        navigate(`/help/article/${articleId}`);
    };

    // Default data in case API is not available
    const defaultCategories = [
        {
            id: 1,
            name: 'Getting Started',
            slug: 'getting-started',
            icon: '🚀',
            description: 'Learn the basics of using Campus Cart',
            article_count: 8,
            color: '#667eea'
        },
        {
            id: 2,
            name: 'Marketplace',
            slug: 'marketplace',
            icon: '🛒',
            description: 'Buying and selling items on Campus Cart',
            article_count: 12,
            color: '#10b981'
        },
        {
            id: 3,
            name: 'Roommate Matching',
            slug: 'roommate-matching',
            icon: '🏠',
            description: 'Finding compatible roommates',
            article_count: 6,
            color: '#f59e0b'
        },
        {
            id: 4,
            name: 'Account & Profile',
            slug: 'account-profile',
            icon: '👤',
            description: 'Managing your account and profile settings',
            article_count: 10,
            color: '#ef4444'
        },
        {
            id: 5,
            name: 'Safety & Security',
            slug: 'safety-security',
            icon: '🛡️',
            description: 'Staying safe while using Campus Cart',
            article_count: 7,
            color: '#8b5cf6'
        },
        {
            id: 6,
            name: 'Payments & Transactions',
            slug: 'payments-transactions',
            icon: '💳',
            description: 'Understanding payments and transactions',
            article_count: 5,
            color: '#06b6d4'
        }
    ];

    const defaultPopularArticles = [
        {
            id: 1,
            title: 'How to create your first listing',
            slug: 'create-first-listing',
            category: 'Marketplace',
            views: 1250,
            helpful_votes: 98
        },
        {
            id: 2,
            title: 'Complete your compatibility quiz',
            slug: 'compatibility-quiz-guide',
            category: 'Roommate Matching',
            views: 1100,
            helpful_votes: 89
        },
        {
            id: 3,
            title: 'Setting up your student profile',
            slug: 'setup-student-profile',
            category: 'Getting Started',
            views: 980,
            helpful_votes: 76
        },
        {
            id: 4,
            title: 'Safety tips for meeting buyers/sellers',
            slug: 'safety-tips-meetings',
            category: 'Safety & Security',
            views: 875,
            helpful_votes: 92
        },
        {
            id: 5,
            title: 'Understanding Campus Cart fees',
            slug: 'understanding-fees',
            category: 'Payments & Transactions',
            views: 654,
            helpful_votes: 71
        }
    ];

    const defaultRecentArticles = [
        {
            id: 6,
            title: 'New roommate matching algorithm updates',
            slug: 'roommate-algorithm-updates',
            category: 'Roommate Matching',
            created_at: '2024-01-15',
            updated_at: '2024-01-15'
        },
        {
            id: 7,
            title: 'Enhanced photo upload guidelines',
            slug: 'photo-upload-guidelines',
            category: 'Marketplace',
            created_at: '2024-01-12',
            updated_at: '2024-01-12'
        },
        {
            id: 8,
            title: 'Two-factor authentication setup',
            slug: 'two-factor-authentication',
            category: 'Account & Profile',
            created_at: '2024-01-10',
            updated_at: '2024-01-10'
        }
    ];

    if (loading) {
        return <LoadingSpinner message="Loading help center..." overlay />;
    }

    return (
        <>
            <Helmet>
                <title>Help Center - Campus Cart</title>
                <meta name="description" content="Get help with Campus Cart. Find answers to common questions about marketplace, roommate matching, and account management." />
            </Helmet>

            <div className="help-page">
                <div className="help-container">
                    {/* Hero Section */}
                    <div className="help-hero">
                        <div className="hero-content">
                            <h1>👋 How can we help you?</h1>
                            <p>Search our help center or browse categories below</p>
                        </div>
                        
                        <div className="hero-search">
                            <SearchBar
                                value={searchQuery}
                                onChange={setSearchQuery}
                                placeholder="Search for help articles..."
                                suggestions={[
                                    'create listing', 'find roommate', 'payment issues',
                                    'account settings', 'safety tips', 'verification'
                                ]}
                                showSuggestions={true}
                            />
                        </div>

                        <div className="hero-stats">
                            <div className="stat-item">
                                <span className="stat-number">50+</span>
                                <span className="stat-label">Help Articles</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-number">24/7</span>
                                <span className="stat-label">Support Available</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-number">95%</span>
                                <span className="stat-label">Issues Resolved</span>
                            </div>
                        </div>
                    </div>

                    {/* Search Results */}
                    {searchQuery.length > 2 && (
                        <div className="search-results-section">
                            <h2>Search Results for "{searchQuery}"</h2>
                            {isSearching ? (
                                <div className="search-loading">
                                    <LoadingSpinner size="small" />
                                    <span>Searching...</span>
                                </div>
                            ) : searchResults.length > 0 ? (
                                <div className="search-results">
                                    {searchResults.map(article => (
                                        <div 
                                            key={article.id}
                                            className="search-result-item"
                                            onClick={() => handleArticleClick(article.id)}
                                        >
                                            <div className="result-header">
                                                <h4>{article.title}</h4>
                                                <span className="result-category">{article.category}</span>
                                            </div>
                                            <p className="result-excerpt">{article.excerpt}</p>
                                            <div className="result-meta">
                                                <span>👀 {article.views} views</span>
                                                <span>👍 {article.helpful_votes} helpful</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="no-results">
                                    <div className="no-results-icon">🔍</div>
                                    <h3>No results found</h3>
                                    <p>Try different keywords or browse categories below</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Categories Section */}
                    {(!searchQuery || searchQuery.length <= 2) && (
                        <>
                            <div className="categories-section">
                                <h2>Browse by Category</h2>
                                <div className="categories-grid">
                                    {categories.map(category => (
                                        <div 
                                            key={category.id}
                                            className="category-card"
                                            onClick={() => handleCategoryClick(category.slug)}
                                            style={{ '--category-color': category.color }}
                                        >
                                            <div className="category-icon" style={{ color: category.color }}>
                                                {category.icon}
                                            </div>
                                            <div className="category-content">
                                                <h3>{category.name}</h3>
                                                <p>{category.description}</p>
                                                <span className="article-count">
                                                    {category.article_count} articles
                                                </span>
                                            </div>
                                            <div className="category-arrow">→</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Popular Articles */}
                            <div className="popular-articles-section">
                                <div className="section-header">
                                    <h2>🔥 Popular Articles</h2>
                                    <Link to="/help/popular" className="view-all-link">
                                        View All Popular
                                    </Link>
                                </div>
                                
                                <div className="articles-list">
                                    {popularArticles.map(article => (
                                        <div 
                                            key={article.id}
                                            className="article-item"
                                            onClick={() => handleArticleClick(article.id)}
                                        >
                                            <div className="article-content">
                                                <h4>{article.title}</h4>
                                                <span className="article-category">{article.category}</span>
                                            </div>
                                            <div className="article-stats">
                                                <span className="stat">👀 {article.views}</span>
                                                <span className="stat">👍 {article.helpful_votes}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Recent Articles */}
                            <div className="recent-articles-section">
                                <div className="section-header">
                                    <h2>📰 Recently Updated</h2>
                                    <Link to="/help/recent" className="view-all-link">
                                        View All Recent
                                    </Link>
                                </div>
                                
                                <div className="articles-list">
                                    {recentArticles.map(article => (
                                        <div 
                                            key={article.id}
                                            className="article-item"
                                            onClick={() => handleArticleClick(article.id)}
                                        >
                                            <div className="article-content">
                                                <h4>{article.title}</h4>
                                                <span className="article-category">{article.category}</span>
                                            </div>
                                            <div className="article-date">
                                                {new Date(article.updated_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="quick-actions-section">
                                <h2>⚡ Quick Actions</h2>
                                <div className="quick-actions-grid">
                                    <Link to="/contact" className="quick-action-card">
                                        <div className="action-icon">📧</div>
                                        <div className="action-content">
                                            <h4>Contact Support</h4>
                                            <p>Get in touch with our support team</p>
                                        </div>
                                    </Link>
                                    
                                    <Link to="/help/faq" className="quick-action-card">
                                        <div className="action-icon">❓</div>
                                        <div className="action-content">
                                            <h4>FAQ</h4>
                                            <p>Frequently asked questions</p>
                                        </div>
                                    </Link>
                                    
                                    <Link to="/help/video-tutorials" className="quick-action-card">
                                        <div className="action-icon">🎥</div>
                                        <div className="action-content">
                                            <h4>Video Tutorials</h4>
                                            <p>Step-by-step video guides</p>
                                        </div>
                                    </Link>
                                    
                                    <Link to="/help/community" className="quick-action-card">
                                        <div className="action-icon">👥</div>
                                        <div className="action-content">
                                            <h4>Community Forum</h4>
                                            <p>Connect with other users</p>
                                        </div>
                                    </Link>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}

export default HelpPage;
