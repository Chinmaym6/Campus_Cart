import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SearchBar from '../components/common/SearchBar';
import LoadingSpinner from '../components/common/LoadingSpinner';
import './Home.css';

function Home() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleSearch = (query) => {
        if (query.trim()) {
            navigate(`/marketplace?search=${encodeURIComponent(query)}`);
        }
    };

    const recentSearches = ['iPhone', 'Textbooks', 'MacBook', 'Furniture'];

    if (loading) {
        return <LoadingSpinner message="Loading..." overlay />;
    }

    return (
        <div className="home-page">
            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-container">
                    <div className="hero-content">
                        <h1 className="hero-title">
                            Your Campus Marketplace
                            <span className="gradient-text"> Simplified</span>
                        </h1>
                        <p className="hero-description">
                            Buy, sell, and find roommates with fellow students. 
                            Safe, trusted, and built for your campus community.
                        </p>
                        
                        <div className="hero-search">
                            <SearchBar 
                                onSearch={handleSearch}
                                placeholder="Search for items, roommates, or services..."
                                showSuggestions={true}
                                recentSearches={recentSearches}
                            />
                        </div>
                        
                        <div className="hero-stats">
                            <div className="stat-item">
                                <span className="stat-number">1,200+</span>
                                <span className="stat-label">Active Students</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-number">850+</span>
                                <span className="stat-label">Items Sold</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-number">200+</span>
                                <span className="stat-label">Roommate Matches</span>
                            </div>
                        </div>
                        
                        <div className="hero-actions">
                            <Link to="/marketplace" className="btn primary large">
                                🛍️ Browse Marketplace
                            </Link>
                            <Link to="/roommates" className="btn secondary large">
                                🏠 Find Roommates
                            </Link>
                        </div>
                    </div>
                    
                    <div className="hero-image">
                        <div className="floating-cards">
                            <div className="float-card">📚 Textbooks</div>
                            <div className="float-card">💻 MacBook Pro</div>
                            <div className="float-card">🏠 Roommate</div>
                            <div className="float-card">📱 iPhone</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Categories Section */}
            <section className="categories-section">
                <div className="container">
                    <h2>Popular Categories</h2>
                    <div className="categories-grid">
                        <Link to="/marketplace?category=textbooks" className="category-card">
                            <div className="category-icon">📚</div>
                            <h3>Textbooks</h3>
                            <p>Find affordable textbooks for all your classes</p>
                        </Link>
                        <Link to="/marketplace?category=electronics" className="category-card">
                            <div className="category-icon">💻</div>
                            <h3>Electronics</h3>
                            <p>Laptops, phones, tablets, and accessories</p>
                        </Link>
                        <Link to="/marketplace?category=furniture" className="category-card">
                            <div className="category-icon">🪑</div>
                            <h3>Furniture</h3>
                            <p>Dorm and apartment furniture essentials</p>
                        </Link>
                        <Link to="/marketplace?category=clothing" className="category-card">
                            <div className="category-icon">👕</div>
                            <h3>Clothing</h3>
                            <p>Trendy clothes and accessories</p>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section">
                <div className="container">
                    <h2>Why Choose Campus Cart?</h2>
                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon">🔒</div>
                            <h3>Secure & Trusted</h3>
                            <p>Student-verified accounts ensure you're trading with real classmates from your campus community.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">📍</div>
                            <h3>Campus-Local</h3>
                            <p>Find items and roommates right on your campus - no long-distance hassles or shipping costs.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">💬</div>
                            <h3>Easy Communication</h3>
                            <p>Built-in messaging system for safe and convenient negotiations with other students.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">⚡</div>
                            <h3>Quick & Simple</h3>
                            <p>List items in minutes and find what you need with our smart search and filtering system.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <div className="container">
                    <div className="cta-content">
                        <h2>Ready to Start Trading?</h2>
                        <p>Join thousands of students already using Campus Cart</p>
                        <div className="cta-actions">
                            <Link to="/register" className="btn primary large">
                                Get Started Free
                            </Link>
                            <Link to="/login" className="btn outline large">
                                Sign In
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default Home;
