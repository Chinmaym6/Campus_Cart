import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Helmet } from 'react-helmet-async';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Toast from '../../components/common/Toast';
import RoommateGrid from '../../components/roommate/RoommateGrid';
import SearchBar from '../../components/common/SearchBar';
import Modal from '../../components/common/Modal';
import CompatibilityQuiz from '../../components/roommate/CompatibilityQuiz';
import api from '../../utils/api';
import './index.css';

function RoommatePage() {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const [roommates, setRoommates] = useState([]);
    const [savedMatches, setSavedMatches] = useState([]);
    const [userPreferences, setUserPreferences] = useState(null);
    const [compatibilityScores, setCompatibilityScores] = useState({});
    const [loading, setLoading] = useState(true);
    const [totalMatches, setTotalMatches] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
    
    // Filter states
    const [filters, setFilters] = useState({
        search: searchParams.get('search') || '',
        location: searchParams.get('location') || '',
        budget_min: searchParams.get('budget_min') || '',
        budget_max: searchParams.get('budget_max') || '',
        room_type: searchParams.get('room_type') || '',
        move_in_timeframe: searchParams.get('move_in_timeframe') || '',
        gender_preference: searchParams.get('gender_preference') || '',
        compatibility_score: searchParams.get('compatibility_score') || '60',
        sortBy: searchParams.get('sortBy') || 'compatibility_desc'
    });

    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const [showQuizModal, setShowQuizModal] = useState(false);
    const [activeTab, setActiveTab] = useState('all'); // all, matches, my_posts

    useEffect(() => {
        fetchUserPreferences();
        fetchRoommates(1, true);
        if (user) {
            fetchSavedMatches();
        }
    }, []);

    useEffect(() => {
        const delayedSearch = setTimeout(() => {
            fetchRoommates(1, true);
            updateURL();
        }, 500);
        
        return () => clearTimeout(delayedSearch);
    }, [filters, activeTab]);

    const fetchUserPreferences = async () => {
        if (!user) return;
        
        try {
            const response = await api.get('/roommate-preferences');
            setUserPreferences(response.data.preferences);
        } catch (error) {
            console.log('No user preferences found');
        }
    };

    const fetchRoommates = async (page = 1, reset = false) => {
        try {
            setLoading(true);
            
            const params = new URLSearchParams();
            
            // Add tab-specific filtering
            if (activeTab === 'matches' && userPreferences) {
                params.append('match_only', 'true');
            } else if (activeTab === 'my_posts' && user) {
                params.append('user_id', user.id);
            }
            
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });
            params.append('page', page);
            params.append('limit', 20);

            const response = await api.get(`/roommate-posts?${params.toString()}`);
            const newRoommates = response.data.posts || [];
            
            if (reset) {
                setRoommates(newRoommates);
                setCurrentPage(1);
            } else {
                setRoommates(prev => [...prev, ...newRoommates]);
            }
            
            setTotalMatches(response.data.total || 0);
            setHasMore(newRoommates.length === 20);
            setCurrentPage(page);
            
            // Calculate compatibility scores if user has preferences
            if (userPreferences && newRoommates.length > 0) {
                const scores = {};
                newRoommates.forEach(roommate => {
                    if (roommate.compatibility_preferences) {
                        scores[roommate.id] = calculateCompatibility(userPreferences, roommate.compatibility_preferences);
                    }
                });
                setCompatibilityScores(prev => ({ ...prev, ...scores }));
            }
            
        } catch (error) {
            console.error('Error fetching roommates:', error);
            showToast('Error loading roommate posts. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchSavedMatches = async () => {
        try {
            const response = await api.get('/roommate-matches/saved');
            setSavedMatches((response.data.matches || []).map(match => match.id));
        } catch (error) {
            console.error('Error fetching saved matches:', error);
        }
    };

    const calculateCompatibility = (userPrefs, matchPrefs) => {
        if (!userPrefs || !matchPrefs) return 50;
        
        let score = 0;
        let totalWeight = 0;
        
        const weights = {
            cleanliness: 0.2,
            noise_level: 0.15,
            social_level: 0.15,
            sleep_schedule: 0.1,
            study_habits: 0.1,
            cooking_habits: 0.1,
            sharing_comfort: 0.1,
            pet_preference: 0.05,
            deal_breakers: 0.05
        };

        Object.entries(weights).forEach(([key, weight]) => {
            if (userPrefs[key] !== undefined && matchPrefs[key] !== undefined) {
                let compatibility = 1;
                
                if (key === 'deal_breakers') {
                    const userBreakers = Array.isArray(userPrefs[key]) ? userPrefs[key] : [];
                    const matchBreakers = Array.isArray(matchPrefs[key]) ? matchPrefs[key] : [];
                    const conflicts = userBreakers.filter(item => matchBreakers.includes(item));
                    compatibility = conflicts.length === 0 ? 1 : 0.3;
                } else if (typeof userPrefs[key] === 'number' && typeof matchPrefs[key] === 'number') {
                    const diff = Math.abs(userPrefs[key] - matchPrefs[key]);
                    compatibility = Math.max(0, 1 - (diff / 4));
                } else if (userPrefs[key] === matchPrefs[key]) {
                    compatibility = 1;
                } else {
                    compatibility = 0.5;
                }
                
                score += compatibility * weight;
                totalWeight += weight;
            }
        });

        return totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 50;
    };

    const updateURL = () => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value && value !== '60') params.set(key, value);
        });
        if (activeTab !== 'all') params.set('tab', activeTab);
        
        const newURL = params.toString() ? `?${params.toString()}` : '';
        navigate(newURL, { replace: true });
    };

    const handleFilterChange = (filterType, value) => {
        setFilters(prev => ({
            ...prev,
            [filterType]: value
        }));
    };

    const handleSaveMatch = async (roommateId) => {
        if (!user) {
            navigate('/login');
            return;
        }

        try {
            const isSaved = savedMatches.includes(roommateId);
            
            if (isSaved) {
                await api.delete(`/roommate-matches/${roommateId}/save`);
                setSavedMatches(prev => prev.filter(id => id !== roommateId));
                showToast('Match removed from saved items', 'success');
            } else {
                await api.post(`/roommate-matches/${roommateId}/save`);
                setSavedMatches(prev => [...prev, roommateId]);
                showToast('Match saved to your favorites!', 'success');
            }
        } catch (error) {
            showToast('Error updating saved matches', 'error');
        }
    };

    const handleContactRoommate = async (roommateId) => {
        if (!user) {
            navigate('/login');
            return;
        }

        try {
            const response = await api.post('/messages/start-chat', {
                recipientId: roommateId,
                context: 'roommate_inquiry'
            });
            
            navigate(`/messages/${response.data.chatId}`);
        } catch (error) {
            showToast('Error starting conversation', 'error');
        }
    };

    const handleLoadMore = () => {
        if (hasMore && !loading) {
            fetchRoommates(currentPage + 1, false);
        }
    };

    const clearAllFilters = () => {
        setFilters({
            search: '',
            location: '',
            budget_min: '',
            budget_max: '',
            room_type: '',
            move_in_timeframe: '',
            gender_preference: '',
            compatibility_score: '60',
            sortBy: 'compatibility_desc'
        });
    };

    const handleQuizComplete = (preferences) => {
        setUserPreferences(preferences);
        setShowQuizModal(false);
        showToast('Compatibility preferences saved! Refreshing matches...', 'success');
        setTimeout(() => {
            fetchRoommates(1, true);
        }, 1000);
    };

    const showToast = (message, type = 'info') => {
        setToast({ show: true, message, type });
    };

    const closeToast = () => {
        setToast({ show: false, message: '', type: 'info' });
    };

    const hasActiveFilters = Object.entries(filters).some(([key, value]) => 
        key !== 'sortBy' && key !== 'compatibility_score' && value !== ''
    );

    return (
        <>
            <Helmet>
                <title>Find Roommates - Campus Cart</title>
                <meta name="description" content="Find compatible roommates at your university. Use our advanced matching system to connect with students who share your lifestyle preferences." />
            </Helmet>

            <div className="roommate-page">
                <div className="roommate-container">
                    {/* Header Section */}
                    <div className="roommate-header">
                        <div className="header-content">
                            <h1>🏠 Find Your Perfect Roommate</h1>
                            <p>Connect with compatible students using our smart matching system</p>
                        </div>
                        
                        <div className="header-actions">
                            <button
                                className="btn secondary mobile-filter-btn"
                                onClick={() => setShowMobileFilters(true)}
                            >
                                🔍 Filters
                            </button>
                            <Link to="/roommate/create" className="btn primary">
                                🏠 Create Post
                            </Link>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="tab-navigation">
                        <div className="tab-buttons">
                            <button
                                className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                                onClick={() => setActiveTab('all')}
                            >
                                <span className="tab-icon">👥</span>
                                <span>All Posts</span>
                                <span className="tab-count">{activeTab === 'all' ? totalMatches : ''}</span>
                            </button>
                            
                            {user && userPreferences && (
                                <button
                                    className={`tab-btn ${activeTab === 'matches' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('matches')}
                                >
                                    <span className="tab-icon">🎯</span>
                                    <span>Best Matches</span>
                                    <span className="tab-count">{activeTab === 'matches' ? totalMatches : ''}</span>
                                </button>
                            )}
                            
                            {user && (
                                <button
                                    className={`tab-btn ${activeTab === 'my_posts' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('my_posts')}
                                >
                                    <span className="tab-icon">📝</span>
                                    <span>My Posts</span>
                                    <span className="tab-count">{activeTab === 'my_posts' ? totalMatches : ''}</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Compatibility Alert */}
                    {user && !userPreferences && activeTab !== 'my_posts' && (
                        <div className="compatibility-alert">
                            <div className="alert-content">
                                <div className="alert-icon">🎯</div>
                                <div className="alert-text">
                                    <h3>Get Better Matches!</h3>
                                    <p>Take our compatibility quiz to find roommates who match your lifestyle and preferences.</p>
                                </div>
                                <button 
                                    className="btn primary"
                                    onClick={() => setShowQuizModal(true)}
                                >
                                    Take Quiz
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Search Section */}
                    <div className="search-section">
                        <SearchBar
                            value={filters.search}
                            onChange={(value) => handleFilterChange('search', value)}
                            placeholder="Search roommate posts..."
                            suggestions={[
                                'clean and quiet', 'social and outgoing', 'study-focused',
                                'pet-friendly', 'non-smoker', 'graduate student'
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
                            {totalMatches > 0 ? (
                                <>
                                    <span className="count-number">{totalMatches.toLocaleString()}</span>
                                    <span className="count-text">
                                        {activeTab === 'matches' ? 'compatible matches' : 
                                         activeTab === 'my_posts' ? 'your posts' : 'roommate posts'} found
                                    </span>
                                </>
                            ) : loading ? (
                                <span>Searching...</span>
                            ) : (
                                <span>No posts found</span>
                            )}
                        </div>
                        
                        <div className="sort-controls">
                            <select
                                value={filters.sortBy}
                                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                                className="sort-select"
                            >
                                {userPreferences && activeTab !== 'my_posts' && (
                                    <>
                                        <option value="compatibility_desc">Best Match First</option>
                                        <option value="compatibility_asc">Lowest Match First</option>
                                    </>
                                )}
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="budget_low">Budget: Low to High</option>
                                <option value="budget_high">Budget: High to Low</option>
                            </select>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="roommate-content">
                        {/* Sidebar Filters */}
                        <aside className={`filters-sidebar ${showMobileFilters ? 'mobile-open' : ''}`}>
                            <div className="sidebar-header">
                                <h3>🔍 Filter Matches</h3>
                                <button
                                    className="close-mobile-filters"
                                    onClick={() => setShowMobileFilters(false)}
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="filter-sections">
                                {userPreferences && activeTab !== 'my_posts' && (
                                    <div className="compatibility-filter">
                                        <h4>Compatibility Score</h4>
                                        <div className="compatibility-slider">
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                value={filters.compatibility_score}
                                                onChange={(e) => handleFilterChange('compatibility_score', e.target.value)}
                                            />
                                            <span className="slider-value">{filters.compatibility_score}%+</span>
                                        </div>
                                    </div>
                                )}

                                <div className="location-filter">
                                    <h4>Location</h4>
                                    <select
                                        value={filters.location}
                                        onChange={(e) => handleFilterChange('location', e.target.value)}
                                        className="filter-select"
                                    >
                                        <option value="">All Locations</option>
                                        <option value="on_campus">On Campus</option>
                                        <option value="near_campus">Near Campus</option>
                                        <option value="downtown">Downtown</option>
                                        <option value="suburbs">Suburbs</option>
                                    </select>
                                </div>

                                <div className="budget-filter">
                                    <h4>Budget Range</h4>
                                    <div className="budget-inputs">
                                        <input
                                            type="number"
                                            placeholder="Min ($)"
                                            value={filters.budget_min}
                                            onChange={(e) => handleFilterChange('budget_min', e.target.value)}
                                            className="budget-input"
                                        />
                                        <span className="budget-separator">-</span>
                                        <input
                                            type="number"
                                            placeholder="Max ($)"
                                            value={filters.budget_max}
                                            onChange={(e) => handleFilterChange('budget_max', e.target.value)}
                                            className="budget-input"
                                        />
                                    </div>
                                </div>

                                <div className="room-type-filter">
                                    <h4>Room Type</h4>
                                    <select
                                        value={filters.room_type}
                                        onChange={(e) => handleFilterChange('room_type', e.target.value)}
                                        className="filter-select"
                                    >
                                        <option value="">Any Type</option>
                                        <option value="private_room">Private Room</option>
                                        <option value="shared_room">Shared Room</option>
                                        <option value="studio_share">Studio Share</option>
                                    </select>
                                </div>

                                <div className="timeframe-filter">
                                    <h4>Move-in Timeframe</h4>
                                    <select
                                        value={filters.move_in_timeframe}
                                        onChange={(e) => handleFilterChange('move_in_timeframe', e.target.value)}
                                        className="filter-select"
                                    >
                                        <option value="">Any Time</option>
                                        <option value="immediate">ASAP</option>
                                        <option value="1_month">Within 1 Month</option>
                                        <option value="3_months">Within 3 Months</option>
                                        <option value="flexible">Flexible</option>
                                    </select>
                                </div>

                                <div className="gender-filter">
                                    <h4>Gender Preference</h4>
                                    <select
                                        value={filters.gender_preference}
                                        onChange={(e) => handleFilterChange('gender_preference', e.target.value)}
                                        className="filter-select"
                                    >
                                        <option value="">No Preference</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="non_binary">Non-binary</option>
                                    </select>
                                </div>
                            </div>

                            {/* Quick Tips */}
                            <div className="sidebar-tips">
                                <h4>💡 Matching Tips</h4>
                                <div className="tips-list">
                                    <div className="tip-item">
                                        <span className="tip-icon">📊</span>
                                        <span>Complete the compatibility quiz for better matches</span>
                                    </div>
                                    <div className="tip-item">
                                        <span className="tip-icon">💬</span>
                                        <span>Message potential roommates early</span>
                                    </div>
                                    <div className="tip-item">
                                        <span className="tip-icon">🎯</span>
                                        <span>Consider 60%+ compatibility scores</span>
                                    </div>
                                </div>
                            </div>
                        </aside>

                        {/* Roommates Grid */}
                        <main className="roommates-section">
                            <RoommateGrid
                                roommates={roommates}
                                loading={loading && currentPage === 1}
                                savedItems={savedMatches}
                                onSave={handleSaveMatch}
                                onContact={handleContactRoommate}
                                showCompatibility={userPreferences && activeTab !== 'my_posts'}
                                compatibilityScores={compatibilityScores}
                                emptyMessage={
                                    activeTab === 'matches' ? "No compatible matches found" :
                                    activeTab === 'my_posts' ? "You haven't created any posts yet" :
                                    "No roommate posts found"
                                }
                                emptyDescription={
                                    activeTab === 'matches' ? "Try lowering your compatibility threshold or updating your preferences" :
                                    activeTab === 'my_posts' ? "Create your first roommate post to start connecting with potential roommates" :
                                    "Try adjusting your search filters or check back later"
                                }
                            />

                            {/* Load More */}
                            {hasMore && roommates.length > 0 && (
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
                                            `🏠 Load More Posts (${Math.min(20, totalMatches - roommates.length)} more)`
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* Pagination Info */}
                            {roommates.length > 0 && (
                                <div className="pagination-info">
                                    Showing {roommates.length} of {totalMatches.toLocaleString()} posts
                                </div>
                            )}
                        </main>
                    </div>

                    {/* Success Stories */}
                    {!hasActiveFilters && roommates.length === 0 && !loading && activeTab === 'all' && (
                        <div className="success-stories">
                            <h3>🌟 Success Stories</h3>
                            <div className="stories-grid">
                                <div className="story-card">
                                    <div className="story-content">
                                        <p>"Found my perfect roommate in just 2 days! The compatibility matching really works."</p>
                                        <div className="story-author">- Sarah, Junior</div>
                                    </div>
                                </div>
                                <div className="story-card">
                                    <div className="story-content">
                                        <p>"Living with someone who shares my study habits has made college so much better!"</p>
                                        <div className="story-author">- Mike, Sophomore</div>
                                    </div>
                                </div>
                                <div className="story-card">
                                    <div className="story-content">
                                        <p>"The detailed profiles helped me find a roommate who's now my best friend."</p>
                                        <div className="story-author">- Emma, Senior</div>
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

                {/* Compatibility Quiz Modal */}
                <Modal
                    isOpen={showQuizModal}
                    onClose={() => setShowQuizModal(false)}
                    title=""
                    size="large"
                    showHeader={false}
                >
                    <CompatibilityQuiz
                        onComplete={handleQuizComplete}
                        existingAnswers={userPreferences}
                    />
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
        </>
    );
}

export default RoommatePage;
