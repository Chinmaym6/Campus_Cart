import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import SearchBar from '../../components/common/SearchBar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import axios from 'axios';
import './faq.css';

function FAQPage() {
    const [faqs, setFaqs] = useState([]);
    const [filteredFaqs, setFilteredFaqs] = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState('all');
    const [expandedItems, setExpandedItems] = useState(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchFAQData();
    }, []);

    useEffect(() => {
        filterFAQs();
    }, [faqs, activeCategory, searchQuery]);

    const fetchFAQData = async () => {
        try {
            setLoading(true);
            
            const [faqsRes, categoriesRes] = await Promise.all([
                axios.get('/help/faqs'),
                axios.get('/help/faq-categories')
            ]);
            
            setFaqs(faqsRes.data.faqs || defaultFAQs);
            setCategories([
                { id: 'all', name: 'All Categories', count: faqsRes.data.faqs?.length || defaultFAQs.length },
                ...(categoriesRes.data.categories || defaultCategories)
            ]);
            
        } catch (error) {
            console.error('Error fetching FAQ data:', error);
            setFaqs(defaultFAQs);
            setCategories([
                { id: 'all', name: 'All Categories', count: defaultFAQs.length },
                ...defaultCategories
            ]);
        } finally {
            setLoading(false);
        }
    };

    const filterFAQs = () => {
        let filtered = faqs;
        
        // Filter by category
        if (activeCategory !== 'all') {
            filtered = filtered.filter(faq => faq.category === activeCategory);
        }
        
        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(faq =>
                faq.question.toLowerCase().includes(query) ||
                faq.answer.toLowerCase().includes(query) ||
                faq.tags?.some(tag => tag.toLowerCase().includes(query))
            );
        }
        
        setFilteredFaqs(filtered);
    };

    const toggleExpanded = (faqId) => {
        const newExpanded = new Set(expandedItems);
        if (newExpanded.has(faqId)) {
            newExpanded.delete(faqId);
        } else {
            newExpanded.add(faqId);
        }
        setExpandedItems(newExpanded);
    };

    const handleVote = async (faqId, helpful) => {
        try {
            await axios.post(`/help/faqs/${faqId}/vote`, { helpful });
            
            // Update local state
            setFaqs(prev => prev.map(faq => 
                faq.id === faqId 
                    ? { 
                        ...faq, 
                        helpful_votes: helpful ? faq.helpful_votes + 1 : faq.helpful_votes,
                        not_helpful_votes: helpful ? faq.not_helpful_votes : faq.not_helpful_votes + 1
                    }
                    : faq
            ));
        } catch (error) {
            console.error('Error voting on FAQ:', error);
        }
    };

    // Default data
    const defaultCategories = [
        { id: 'account', name: 'Account & Profile', count: 8 },
        { id: 'marketplace', name: 'Marketplace', count: 12 },
        { id: 'roommate', name: 'Roommate Matching', count: 6 },
        { id: 'payment', name: 'Payments', count: 5 },
        { id: 'safety', name: 'Safety & Security', count: 7 },
        { id: 'technical', name: 'Technical Issues', count: 4 }
    ];

    const defaultFAQs = [
        {
            id: 1,
            question: 'How do I create my first listing?',
            answer: 'To create your first listing: 1) Go to the Marketplace section, 2) Click "Sell Item", 3) Fill in item details including photos, description, and price, 4) Set your location and availability, 5) Review and publish your listing.',
            category: 'marketplace',
            tags: ['listing', 'sell', 'create'],
            helpful_votes: 45,
            not_helpful_votes: 2,
            popular: true
        },
        {
            id: 2,
            question: 'How does the roommate compatibility matching work?',
            answer: 'Our compatibility system uses a detailed quiz about your lifestyle preferences, study habits, cleanliness levels, and social preferences. We then match you with roommates who have similar or compatible answers, giving you a compatibility score from 0-100%.',
            category: 'roommate',
            tags: ['compatibility', 'matching', 'algorithm'],
            helpful_votes: 38,
            not_helpful_votes: 1,
            popular: true
        },
        {
            id: 3,
            question: 'Is it safe to meet buyers and sellers?',
            answer: 'Yes, when you follow our safety guidelines: 1) Meet in public places during daylight, 2) Bring a friend if possible, 3) Let someone know where you\'re going, 4) Trust your instincts, 5) Use our in-app messaging system before meeting.',
            category: 'safety',
            tags: ['safety', 'meeting', 'security'],
            helpful_votes: 52,
            not_helpful_votes: 3,
            popular: true
        },
        {
            id: 4,
            question: 'How do I verify my student status?',
            answer: 'To verify your student status: 1) Go to Profile Settings, 2) Click "Verify Student Status", 3) Upload a photo of your student ID or enrollment letter, 4) Wait 1-2 business days for verification. Verified students get a badge and additional features.',
            category: 'account',
            tags: ['verification', 'student', 'profile'],
            helpful_votes: 29,
            not_helpful_votes: 1,
            popular: false
        },
        {
            id: 5,
            question: 'What payment methods are accepted?',
            answer: 'We support various payment methods including credit/debit cards, PayPal, Apple Pay, Google Pay, and bank transfers. For in-person transactions, cash is also commonly used between students.',
            category: 'payment',
            tags: ['payment', 'methods', 'transactions'],
            helpful_votes: 31,
            not_helpful_votes: 2,
            popular: false
        }
    ];

    if (loading) {
        return <LoadingSpinner message="Loading FAQ..." overlay />;
    }

    return (
        <>
            <Helmet>
                <title>Frequently Asked Questions - Campus Cart Help</title>
                <meta name="description" content="Find answers to common questions about Campus Cart marketplace, roommate matching, account management, and more." />
            </Helmet>

            <div className="faq-page">
                <div className="faq-container">
                    {/* Header */}
                    <div className="faq-header">
                        <h1>❓ Frequently Asked Questions</h1>
                        <p>Find quick answers to the most common questions about Campus Cart</p>
                        
                        <div className="faq-search">
                            <SearchBar
                                value={searchQuery}
                                onChange={setSearchQuery}
                                placeholder="Search FAQ..."
                                suggestions={['create listing', 'roommate matching', 'payment', 'verification']}
                            />
                        </div>
                    </div>

                    <div className="faq-content">
                        {/* Categories Sidebar */}
                        <aside className="faq-sidebar">
                            <h3>Categories</h3>
                            <div className="category-filters">
                                {categories.map(category => (
                                    <button
                                        key={category.id}
                                        className={`category-btn ${activeCategory === category.id ? 'active' : ''}`}
                                        onClick={() => setActiveCategory(category.id)}
                                    >
                                        <span className="category-name">{category.name}</span>
                                        <span className="category-count">({category.count})</span>
                                    </button>
                                ))}
                            </div>
                        </aside>

                        {/* FAQ List */}
                        <main className="faq-main">
                            {searchQuery && (
                                <div className="search-results-header">
                                    <h2>
                                        {filteredFaqs.length} result{filteredFaqs.length !== 1 ? 's' : ''} 
                                        for "{searchQuery}"
                                    </h2>
                                </div>
                            )}

                            {filteredFaqs.length > 0 ? (
                                <div className="faq-list">
                                    {filteredFaqs.map(faq => (
                                        <div key={faq.id} className="faq-item">
                                            <div 
                                                className="faq-question"
                                                onClick={() => toggleExpanded(faq.id)}
                                            >
                                                <h3>{faq.question}</h3>
                                                <div className="question-meta">
                                                    {faq.popular && <span className="popular-badge">🔥 Popular</span>}
                                                    <button className="expand-btn">
                                                        {expandedItems.has(faq.id) ? '−' : '+'}
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            {expandedItems.has(faq.id) && (
                                                <div className="faq-answer">
                                                    <p>{faq.answer}</p>
                                                    
                                                    {faq.tags && (
                                                        <div className="faq-tags">
                                                            {faq.tags.map(tag => (
                                                                <span key={tag} className="faq-tag">{tag}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    
                                                    <div className="faq-actions">
                                                        <div className="faq-voting">
                                                            <span>Was this helpful?</span>
                                                            <button 
                                                                className="vote-btn helpful"
                                                                onClick={() => handleVote(faq.id, true)}
                                                            >
                                                                👍 Yes ({faq.helpful_votes})
                                                            </button>
                                                            <button 
                                                                className="vote-btn not-helpful"
                                                                onClick={() => handleVote(faq.id, false)}
                                                            >
                                                                👎 No ({faq.not_helpful_votes})
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="no-faqs">
                                    <div className="no-faqs-icon">🔍</div>
                                    <h3>No FAQs found</h3>
                                    <p>
                                        {searchQuery 
                                            ? `No questions match "${searchQuery}". Try different keywords or browse categories.`
                                            : 'No FAQs available for this category.'
                                        }
                                    </p>
                                </div>
                            )}
                        </main>
                    </div>

                    {/* Still Need Help */}
                    <div className="still-need-help">
                        <h2>Still need help?</h2>
                        <p>Can't find what you're looking for? We're here to help!</p>
                        <div className="help-actions">
                            <a href="/help/contact" className="btn primary">
                                📧 Contact Support
                            </a>
                            <a href="/help" className="btn secondary">
                                📚 Browse Help Articles
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default FAQPage;
