import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import Toast from '../common/Toast';
import Modal from '../common/Modal';
import RoommateCard from './RoommateCard';
import axios from 'axios';
import './MatchingResults.css';

function MatchingResults() {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        compatibility_score: 70,
        budget_range: '',
        location: '',
        move_in_timeframe: '',
        gender_preference: '',
        room_type: ''
    });
    const [sortBy, setSortBy] = useState('compatibility_desc');
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [userPreferences, setUserPreferences] = useState(null);
    const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

    useEffect(() => {
        fetchUserPreferences();
        fetchMatches();
    }, [filters, sortBy]);

    const fetchUserPreferences = async () => {
        try {
            const response = await axios.get('/roommate-preferences');
            setUserPreferences(response.data.preferences);
        } catch (error) {
            console.log('No user preferences found');
        }
    };

    const fetchMatches = async () => {
        try {
            setLoading(true);
            
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });
            params.append('sort_by', sortBy);

            const response = await axios.get(`/roommate-matches?${params.toString()}`);
            setMatches(response.data.matches || []);
        } catch (error) {
            console.error('Error fetching matches:', error);
            showToast('Error loading matches. Please try again.', 'error');
        } finally {
            setLoading(false);
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

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleContactMatch = async (matchId) => {
        try {
            const response = await axios.post('/messages/start-chat', {
                recipientId: matchId,
                context: 'roommate_match'
            });
            
            showToast('Chat started! You can now message this person.', 'success');
            // Navigate to chat or show success message
        } catch (error) {
            showToast('Error starting conversation', 'error');
        }
    };

    const handleSaveMatch = async (matchId) => {
        try {
            await axios.post(`/roommate-matches/${matchId}/save`);
            showToast('Match saved to your favorites!', 'success');
            
            // Update local state
            setMatches(prev => prev.map(match => 
                match.id === matchId ? { ...match, is_saved: true } : match
            ));
        } catch (error) {
            showToast('Error saving match', 'error');
        }
    };

    const showToast = (message, type = 'info') => {
        setToast({ show: true, message, type });
    };

    const closeToast = () => {
        setToast({ show: false, message: '', type: 'info' });
    };

    const getCompatibilityColor = (score) => {
        if (score >= 80) return '#10b981'; // Green
        if (score >= 60) return '#f59e0b'; // Yellow
        return '#ef4444'; // Red
    };

    const getCompatibilityLabel = (score) => {
        if (score >= 80) return 'Excellent Match';
        if (score >= 60) return 'Good Match';
        return 'Fair Match';
    };

    return (
        <div className="matching-results-page">
            <div className="matching-container">
                <div className="page-header">
                    <div className="header-content">
                        <h1>🎯 Your Roommate Matches</h1>
                        <p>Personalized matches based on your compatibility preferences</p>
                    </div>
                    
                    <div className="header-actions">
                        <Link to="/roommates/create" className="btn secondary">
                            🏠 Create Post
                        </Link>
                        <Link to="/roommates/compatibility" className="btn primary">
                            📊 Update Preferences
                        </Link>
                    </div>
                </div>

                {/* Filters Section */}
                <div className="filters-section">
                    <div className="filters-header">
                        <h3>🔍 Refine Your Matches</h3>
                        <div className="results-count">
                            {matches.length} potential matches found
                        </div>
                    </div>

                    <div className="filters-grid">
                        <div className="filter-group">
                            <label>Minimum Compatibility</label>
                            <div className="compatibility-slider">
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={filters.compatibility_score}
                                    onChange={(e) => handleFilterChange('compatibility_score', e.target.value)}
                                />
                                <span className="slider-value">{filters.compatibility_score}%</span>
                            </div>
                        </div>

                        <div className="filter-group">
                            <label htmlFor="budget-filter">Budget Range</label>
                            <select
                                id="budget-filter"
                                value={filters.budget_range}
                                onChange={(e) => handleFilterChange('budget_range', e.target.value)}
                            >
                                <option value="">Any budget</option>
                                <option value="0-500">Under $500</option>
                                <option value="500-800">$500 - $800</option>
                                <option value="800-1200">$800 - $1200</option>
                                <option value="1200+">$1200+</option>
                            </select>
                        </div>

                        <div className="filter-group">
                            <label htmlFor="location-filter">Location</label>
                            <select
                                id="location-filter"
                                value={filters.location}
                                onChange={(e) => handleFilterChange('location', e.target.value)}
                            >
                                <option value="">Any location</option>
                                <option value="on_campus">On campus</option>
                                <option value="near_campus">Near campus (walking distance)</option>
                                <option value="downtown">Downtown</option>
                                <option value="suburbs">Suburbs</option>
                            </select>
                        </div>

                        <div className="filter-group">
                            <label htmlFor="timeframe-filter">Move-in Timeframe</label>
                            <select
                                id="timeframe-filter"
                                value={filters.move_in_timeframe}
                                onChange={(e) => handleFilterChange('move_in_timeframe', e.target.value)}
                            >
                                <option value="">Any time</option>
                                <option value="immediate">ASAP</option>
                                <option value="1_month">Within 1 month</option>
                                <option value="3_months">Within 3 months</option>
                                <option value="flexible">Flexible</option>
                            </select>
                        </div>

                        <div className="filter-group">
                            <label htmlFor="sort-filter">Sort by</label>
                            <select
                                id="sort-filter"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                <option value="compatibility_desc">Best Match First</option>
                                <option value="compatibility_asc">Lowest Match First</option>
                                <option value="newest">Newest Posts</option>
                                <option value="budget_low">Budget: Low to High</option>
                                <option value="budget_high">Budget: High to Low</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Matches Results */}
                <div className="matches-section">
                    {loading ? (
                        <LoadingSpinner message="Finding your perfect matches..." />
                    ) : matches.length > 0 ? (
                        <>
                            <div className="matches-grid">
                                {matches.map(match => {
                                    const compatibilityScore = calculateCompatibility(
                                        userPreferences, 
                                        match.compatibility_preferences
                                    );
                                    
                                    return (
                                        <div key={match.id} className="match-card">
                                            <div className="match-header">
                                                <div className="compatibility-badge" 
                                                     style={{ backgroundColor: getCompatibilityColor(compatibilityScore) }}>
                                                    <span className="compatibility-score">{compatibilityScore}%</span>
                                                    <span className="compatibility-label">
                                                        {getCompatibilityLabel(compatibilityScore)}
                                                    </span>
                                                </div>
                                                
                                                <button
                                                    className={`save-btn ${match.is_saved ? 'saved' : ''}`}
                                                    onClick={() => handleSaveMatch(match.id)}
                                                >
                                                    {match.is_saved ? '❤️' : '🤍'}
                                                </button>
                                            </div>

                                            <RoommateCard 
                                                roommate={match}
                                                showCompatibility={true}
                                                compatibilityScore={compatibilityScore}
                                            />

                                            <div className="match-actions">
                                                <button
                                                    className="btn primary"
                                                    onClick={() => handleContactMatch(match.user_id)}
                                                >
                                                    💬 Start Chat
                                                </button>
                                                <button
                                                    className="btn secondary"
                                                    onClick={() => {
                                                        setSelectedMatch(match);
                                                        setShowDetailsModal(true);
                                                    }}
                                                >
                                                    📋 View Details
                                                </button>
                                            </div>

                                            {compatibilityScore >= 80 && (
                                                <div className="high-match-banner">
                                                    ⭐ Highly Compatible Match!
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Load More */}
                            {matches.length >= 20 && (
                                <div className="load-more-section">
                                    <button className="btn outline">
                                        Load More Matches
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="no-matches">
                            <div className="no-matches-icon">🔍</div>
                            <h3>No matches found</h3>
                            <p>
                                Try adjusting your filters or updating your compatibility preferences 
                                to find more potential roommates.
                            </p>
                            <div className="no-matches-actions">
                                <button
                                    className="btn primary"
                                    onClick={() => {
                                        setFilters({
                                            compatibility_score: 50,
                                            budget_range: '',
                                            location: '',
                                            move_in_timeframe: '',
                                            gender_preference: '',
                                            room_type: ''
                                        });
                                    }}
                                >
                                    Reset Filters
                                </button>
                                <Link to="/roommates/compatibility" className="btn secondary">
                                    Update Preferences
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                {/* Tips Section */}
                <div className="matching-tips">
                    <h3>💡 Tips for Better Matches</h3>
                    <div className="tips-grid">
                        <div className="tip-card">
                            <div className="tip-icon">📊</div>
                            <div className="tip-content">
                                <h4>Complete Your Profile</h4>
                                <p>Add photos and detailed preferences to get better matches</p>
                            </div>
                        </div>
                        <div className="tip-card">
                            <div className="tip-icon">💬</div>
                            <div className="tip-content">
                                <h4>Start Conversations</h4>
                                <p>Don't wait! Reach out to matches you're interested in</p>
                            </div>
                        </div>
                        <div className="tip-card">
                            <div className="tip-icon">🎯</div>
                            <div className="tip-content">
                                <h4>Be Flexible</h4>
                                <p>Consider matches with 60%+ compatibility - they might surprise you!</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Match Details Modal */}
            <Modal
                isOpen={showDetailsModal}
                onClose={() => setShowDetailsModal(false)}
                title="Match Details"
                size="large"
            >
                {selectedMatch && (
                    <div className="match-details-modal">
                        <div className="match-overview">
                            <div className="match-profile">
                                <div className="profile-avatar">
                                    {selectedMatch.profile_picture_url ? (
                                        <img src={selectedMatch.profile_picture_url} alt="Profile" />
                                    ) : (
                                        <span>{selectedMatch.first_name?.[0]}{selectedMatch.last_name?.[0]}</span>
                                    )}
                                </div>
                                <div className="profile-info">
                                    <h3>{selectedMatch.first_name} {selectedMatch.last_name}</h3>
                                    <p>{selectedMatch.bio}</p>
                                </div>
                            </div>

                            <div className="compatibility-breakdown">
                                <h4>Compatibility Breakdown</h4>
                                {userPreferences && selectedMatch.compatibility_preferences && (
                                    <div className="compatibility-items">
                                        {Object.entries(userPreferences).map(([key, value]) => {
                                            if (selectedMatch.compatibility_preferences[key] !== undefined) {
                                                const matchValue = selectedMatch.compatibility_preferences[key];
                                                const isMatch = value === matchValue;
                                                
                                                return (
                                                    <div key={key} className="compatibility-item">
                                                        <span className="compatibility-trait">
                                                            {key.replace('_', ' ')}:
                                                        </span>
                                                        <span className={`compatibility-status ${isMatch ? 'match' : 'different'}`}>
                                                            {isMatch ? '✅ Match' : '⚠️ Different'}
                                                        </span>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
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

export default MatchingResults;
