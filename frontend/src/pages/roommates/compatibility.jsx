import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Toast from '../../components/common/Toast';
import Modal from '../../components/common/Modal';
import CompatibilityQuiz from '../../components/roommate/CompatibilityQuiz';
import axios from 'axios';
import './compatibility.css';

function CompatibilityPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [userPreferences, setUserPreferences] = useState(null);
    const [compatibilityMatches, setCompatibilityMatches] = useState([]);
    const [analyticsData, setAnalyticsData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showQuizModal, setShowQuizModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        fetchCompatibilityData();
    }, [user, navigate]);

    const fetchCompatibilityData = async () => {
        try {
            setLoading(true);
            
            const [preferencesRes, matchesRes, analyticsRes] = await Promise.all([
                axios.get('/roommate-preferences'),
                axios.get('/roommate-matches/compatibility'),
                axios.get('/roommate-analytics/compatibility')
            ]);
            
            setUserPreferences(preferencesRes.data.preferences);
            setCompatibilityMatches(matchesRes.data.matches || []);
            setAnalyticsData(analyticsRes.data.analytics || defaultAnalytics);
            
        } catch (error) {
            console.error('Error fetching compatibility data:', error);
            if (error.response?.status === 404) {
                // No preferences found, show quiz
                setUserPreferences(null);
            }
            setAnalyticsData(defaultAnalytics);
        } finally {
            setLoading(false);
        }
    };

    const handleQuizComplete = async (preferences) => {
        try {
            await axios.post('/roommate-preferences', { preferences });
            setUserPreferences(preferences);
            setShowQuizModal(false);
            showToast('Compatibility preferences saved! Finding your matches...', 'success');
            
            // Refresh matches after preferences are saved
            setTimeout(() => {
                fetchCompatibilityData();
            }, 1000);
            
        } catch (error) {
            console.error('Error saving preferences:', error);
            showToast('Error saving preferences. Please try again.', 'error');
        }
    };

    const handleEditPreferences = () => {
        setShowEditModal(true);
    };

    const handleUpdatePreferences = async (newPreferences) => {
        try {
            await axios.put('/roommate-preferences', { preferences: newPreferences });
            setUserPreferences(newPreferences);
            setShowEditModal(false);
            showToast('Preferences updated successfully!', 'success');
            
            // Refresh matches
            fetchCompatibilityData();
            
        } catch (error) {
            console.error('Error updating preferences:', error);
            showToast('Error updating preferences. Please try again.', 'error');
        }
    };

    const calculateCompatibilityScore = (userPrefs, matchPrefs) => {
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

    const showToast = (message, type = 'info') => {
        setToast({ show: true, message, type });
    };

    const closeToast = () => {
        setToast({ show: false, message: '', type: 'info' });
    };

    // Default analytics data
    const defaultAnalytics = {
        totalMatches: 0,
        averageCompatibility: 0,
        topCompatibilityFactors: [
            { factor: 'Cleanliness', score: 0 },
            { factor: 'Study Habits', score: 0 },
            { factor: 'Social Level', score: 0 }
        ],
        compatibilityDistribution: {
            excellent: 0, // 90-100%
            good: 0,      // 70-89%
            fair: 0,      // 50-69%
            poor: 0       // 0-49%
        },
        improveableAreas: [
            'Complete your compatibility quiz',
            'Add more lifestyle details',
            'Upload profile photos'
        ]
    };

    const getCompatibilityColor = (score) => {
        if (score >= 90) return '#10b981'; // Green
        if (score >= 70) return '#f59e0b'; // Yellow
        if (score >= 50) return '#ef4444'; // Red
        return '#9ca3af'; // Gray
    };

    const getCompatibilityLabel = (score) => {
        if (score >= 90) return 'Excellent';
        if (score >= 70) return 'Good';
        if (score >= 50) return 'Fair';
        return 'Poor';
    };

    if (loading) {
        return <LoadingSpinner message="Loading compatibility data..." overlay />;
    }

    return (
        <>
            <Helmet>
                <title>Compatibility Analysis - Campus Cart Roommates</title>
                <meta name="description" content="Analyze your roommate compatibility preferences and find the perfect match based on lifestyle factors." />
            </Helmet>

            <div className="compatibility-page">
                <div className="compatibility-container">
                    {/* Header */}
                    <div className="compatibility-header">
                        <div className="header-content">
                            <h1>🎯 Compatibility Analysis</h1>
                            <p>Discover your perfect roommate match through our advanced compatibility system</p>
                        </div>
                        
                        <div className="header-actions">
                            {userPreferences ? (
                                <button 
                                    className="btn secondary"
                                    onClick={handleEditPreferences}
                                >
                                    ✏️ Edit Preferences
                                </button>
                            ) : (
                                <button 
                                    className="btn primary"
                                    onClick={() => setShowQuizModal(true)}
                                >
                                    🚀 Take Compatibility Quiz
                                </button>
                            )}
                            <Link to="/roommate" className="btn secondary">
                                🏠 Browse Roommates
                            </Link>
                        </div>
                    </div>

                    {/* No Preferences State */}
                    {!userPreferences && (
                        <div className="no-preferences-section">
                            <div className="no-preferences-card">
                                <div className="no-preferences-icon">🎯</div>
                                <h2>Complete Your Compatibility Profile</h2>
                                <p>
                                    Take our comprehensive compatibility quiz to find roommates who match your 
                                    lifestyle, study habits, and living preferences.
                                </p>
                                
                                <div className="quiz-benefits">
                                    <div className="benefit-item">
                                        <span className="benefit-icon">✅</span>
                                        <span>Find compatible roommates faster</span>
                                    </div>
                                    <div className="benefit-item">
                                        <span className="benefit-icon">📊</span>
                                        <span>Get personalized compatibility scores</span>
                                    </div>
                                    <div className="benefit-item">
                                        <span className="benefit-icon">🎯</span>
                                        <span>Avoid lifestyle conflicts</span>
                                    </div>
                                    <div className="benefit-item">
                                        <span className="benefit-icon">💡</span>
                                        <span>Receive tailored recommendations</span>
                                    </div>
                                </div>
                                
                                <button 
                                    className="btn primary large"
                                    onClick={() => setShowQuizModal(true)}
                                >
                                    🚀 Start Compatibility Quiz
                                </button>
                                
                                <p className="quiz-time">Takes about 5 minutes to complete</p>
                            </div>
                        </div>
                    )}

                    {/* Has Preferences - Main Content */}
                    {userPreferences && (
                        <>
                            {/* Tab Navigation */}
                            <div className="compatibility-nav">
                                <button 
                                    className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('overview')}
                                >
                                    📊 Overview
                                </button>
                                <button 
                                    className={`nav-tab ${activeTab === 'matches' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('matches')}
                                >
                                    🎯 Top Matches
                                </button>
                                <button 
                                    className={`nav-tab ${activeTab === 'preferences' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('preferences')}
                                >
                                    ⚙️ My Preferences
                                </button>
                                <button 
                                    className={`nav-tab ${activeTab === 'insights' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('insights')}
                                >
                                    💡 Insights
                                </button>
                            </div>

                            {/* Overview Tab */}
                            {activeTab === 'overview' && (
                                <div className="overview-section">
                                    {/* Compatibility Summary */}
                                    <div className="compatibility-summary">
                                        <h2>Your Compatibility Summary</h2>
                                        <div className="summary-grid">
                                            <div className="summary-card">
                                                <div className="summary-icon">🎯</div>
                                                <div className="summary-content">
                                                    <div className="summary-number">{analyticsData.totalMatches}</div>
                                                    <div className="summary-label">Total Matches</div>
                                                </div>
                                            </div>
                                            
                                            <div className="summary-card">
                                                <div className="summary-icon">📊</div>
                                                <div className="summary-content">
                                                    <div className="summary-number">{analyticsData.averageCompatibility}%</div>
                                                    <div className="summary-label">Avg Compatibility</div>
                                                </div>
                                            </div>
                                            
                                            <div className="summary-card">
                                                <div className="summary-icon">⭐</div>
                                                <div className="summary-content">
                                                    <div className="summary-number">{analyticsData.compatibilityDistribution.excellent}</div>
                                                    <div className="summary-label">Excellent Matches</div>
                                                </div>
                                            </div>
                                            
                                            <div className="summary-card">
                                                <div className="summary-icon">🔥</div>
                                                <div className="summary-content">
                                                    <div className="summary-number">{analyticsData.compatibilityDistribution.good}</div>
                                                    <div className="summary-label">Good Matches</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Compatibility Distribution */}
                                    <div className="compatibility-distribution">
                                        <h3>Compatibility Distribution</h3>
                                        <div className="distribution-chart">
                                            <div className="chart-bars">
                                                <div className="chart-bar excellent">
                                                    <div 
                                                        className="bar-fill"
                                                        style={{ 
                                                            height: `${Math.max(10, (analyticsData.compatibilityDistribution.excellent / Math.max(1, analyticsData.totalMatches)) * 100)}%` 
                                                        }}
                                                    ></div>
                                                    <div className="bar-label">Excellent</div>
                                                    <div className="bar-count">{analyticsData.compatibilityDistribution.excellent}</div>
                                                </div>
                                                
                                                <div className="chart-bar good">
                                                    <div 
                                                        className="bar-fill"
                                                        style={{ 
                                                            height: `${Math.max(10, (analyticsData.compatibilityDistribution.good / Math.max(1, analyticsData.totalMatches)) * 100)}%` 
                                                        }}
                                                    ></div>
                                                    <div className="bar-label">Good</div>
                                                    <div className="bar-count">{analyticsData.compatibilityDistribution.good}</div>
                                                </div>
                                                
                                                <div className="chart-bar fair">
                                                    <div 
                                                        className="bar-fill"
                                                        style={{ 
                                                            height: `${Math.max(10, (analyticsData.compatibilityDistribution.fair / Math.max(1, analyticsData.totalMatches)) * 100)}%` 
                                                        }}
                                                    ></div>
                                                    <div className="bar-label">Fair</div>
                                                    <div className="bar-count">{analyticsData.compatibilityDistribution.fair}</div>
                                                </div>
                                                
                                                <div className="chart-bar poor">
                                                    <div 
                                                        className="bar-fill"
                                                        style={{ 
                                                            height: `${Math.max(10, (analyticsData.compatibilityDistribution.poor / Math.max(1, analyticsData.totalMatches)) * 100)}%` 
                                                        }}
                                                    ></div>
                                                    <div className="bar-label">Poor</div>
                                                    <div className="bar-count">{analyticsData.compatibilityDistribution.poor}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Top Compatibility Factors */}
                                    <div className="top-factors">
                                        <h3>Your Strongest Compatibility Factors</h3>
                                        <div className="factors-list">
                                            {analyticsData.topCompatibilityFactors.map((factor, index) => (
                                                <div key={index} className="factor-item">
                                                    <div className="factor-rank">#{index + 1}</div>
                                                    <div className="factor-content">
                                                        <div className="factor-name">{factor.factor}</div>
                                                        <div className="factor-score">{factor.score}% match rate</div>
                                                    </div>
                                                    <div className="factor-bar">
                                                        <div 
                                                            className="factor-fill"
                                                            style={{ width: `${factor.score}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Top Matches Tab */}
                            {activeTab === 'matches' && (
                                <div className="matches-section">
                                    <div className="matches-header">
                                        <h2>Your Top Compatibility Matches</h2>
                                        <p>Based on your lifestyle preferences and compatibility factors</p>
                                    </div>
                                    
                                    {compatibilityMatches.length > 0 ? (
                                        <div className="matches-grid">
                                            {compatibilityMatches.slice(0, 6).map(match => {
                                                const score = calculateCompatibilityScore(userPreferences, match.compatibility_preferences);
                                                return (
                                                    <div key={match.id} className="match-card">
                                                        <div className="match-header">
                                                            <div className="match-avatar">
                                                                {match.profile_picture_url ? (
                                                                    <img src={match.profile_picture_url} alt={match.name} />
                                                                ) : (
                                                                    <span className="avatar-initials">
                                                                        {match.name?.charAt(0)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="match-info">
                                                                <h4>{match.name}</h4>
                                                                <p>{match.major} • {match.graduation_year}</p>
                                                            </div>
                                                            <div 
                                                                className="compatibility-score"
                                                                style={{ color: getCompatibilityColor(score) }}
                                                            >
                                                                {score}%
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="match-details">
                                                            <div className="detail-item">
                                                                <span className="detail-label">Budget:</span>
                                                                <span className="detail-value">${match.budget_min} - ${match.budget_max}</span>
                                                            </div>
                                                            <div className="detail-item">
                                                                <span className="detail-label">Move-in:</span>
                                                                <span className="detail-value">{match.move_in_timeframe}</span>
                                                            </div>
                                                            <div className="detail-item">
                                                                <span className="detail-label">Location:</span>
                                                                <span className="detail-value">{match.preferred_location}</span>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="match-actions">
                                                            <Link 
                                                                to={`/roommate/post/${match.id}`}
                                                                className="btn secondary small"
                                                            >
                                                                View Profile
                                                            </Link>
                                                            <button className="btn primary small">
                                                                💬 Message
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="no-matches">
                                            <div className="no-matches-icon">🎯</div>
                                            <h3>No matches found yet</h3>
                                            <p>Don't worry! New roommate posts are added daily. Check back soon or adjust your preferences.</p>
                                            <div className="no-matches-actions">
                                                <button 
                                                    className="btn secondary"
                                                    onClick={handleEditPreferences}
                                                >
                                                    ⚙️ Adjust Preferences
                                                </button>
                                                <Link to="/roommate" className="btn primary">
                                                    🏠 Browse All Posts
                                                </Link>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {compatibilityMatches.length > 6 && (
                                        <div className="view-all-matches">
                                            <Link to="/roommate/matches" className="btn primary">
                                                View All {compatibilityMatches.length} Matches
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Preferences Tab */}
                            {activeTab === 'preferences' && (
                                <div className="preferences-section">
                                    <div className="preferences-header">
                                        <h2>Your Compatibility Preferences</h2>
                                        <button 
                                            className="btn primary"
                                            onClick={handleEditPreferences}
                                        >
                                            ✏️ Edit Preferences
                                        </button>
                                    </div>
                                    
                                    <div className="preferences-grid">
                                        <div className="preference-category">
                                            <h3>🧹 Living Habits</h3>
                                            <div className="preference-items">
                                                <div className="preference-item">
                                                    <span className="pref-label">Cleanliness Level:</span>
                                                    <span className="pref-value">{userPreferences.cleanliness}/5</span>
                                                </div>
                                                <div className="preference-item">
                                                    <span className="pref-label">Noise Tolerance:</span>
                                                    <span className="pref-value">{userPreferences.noise_level}/5</span>
                                                </div>
                                                <div className="preference-item">
                                                    <span className="pref-label">Sharing Comfort:</span>
                                                    <span className="pref-value">{userPreferences.sharing_comfort}/5</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="preference-category">
                                            <h3>😴 Lifestyle</h3>
                                            <div className="preference-items">
                                                <div className="preference-item">
                                                    <span className="pref-label">Social Level:</span>
                                                    <span className="pref-value">{userPreferences.social_level}/5</span>
                                                </div>
                                                <div className="preference-item">
                                                    <span className="pref-label">Sleep Schedule:</span>
                                                    <span className="pref-value">{userPreferences.sleep_schedule}/5</span>
                                                </div>
                                                <div className="preference-item">
                                                    <span className="pref-label">Study Habits:</span>
                                                    <span className="pref-value">{userPreferences.study_habits}/5</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="preference-category">
                                            <h3>🍳 Other Preferences</h3>
                                            <div className="preference-items">
                                                <div className="preference-item">
                                                    <span className="pref-label">Cooking Habits:</span>
                                                    <span className="pref-value">{userPreferences.cooking_habits}/5</span>
                                                </div>
                                                <div className="preference-item">
                                                    <span className="pref-label">Pet Preference:</span>
                                                    <span className="pref-value">{userPreferences.pet_preference}/5</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {userPreferences.deal_breakers && userPreferences.deal_breakers.length > 0 && (
                                            <div className="preference-category deal-breakers">
                                                <h3>🚫 Deal Breakers</h3>
                                                <div className="deal-breakers-list">
                                                    {userPreferences.deal_breakers.map((breaker, index) => (
                                                        <span key={index} className="deal-breaker-tag">
                                                            {breaker}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Insights Tab */}
                            {activeTab === 'insights' && (
                                <div className="insights-section">
                                    <div className="insights-header">
                                        <h2>Compatibility Insights</h2>
                                        <p>Personalized recommendations to improve your matching success</p>
                                    </div>
                                    
                                    <div className="insights-grid">
                                        <div className="insight-card tips">
                                            <h3>💡 Matching Tips</h3>
                                            <div className="insight-list">
                                                <div className="insight-item">
                                                    <span className="insight-icon">🎯</span>
                                                    <span>Look for 70%+ compatibility scores for best results</span>
                                                </div>
                                                <div className="insight-item">
                                                    <span className="insight-icon">💬</span>
                                                    <span>Message matches early to secure good roommates</span>
                                                </div>
                                                <div className="insight-item">
                                                    <span className="insight-icon">🔍</span>
                                                    <span>Read full profiles beyond just compatibility scores</span>
                                                </div>
                                                <div className="insight-item">
                                                    <span className="insight-icon">📅</span>
                                                    <span>Update your preferences seasonally for better matches</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="insight-card improvements">
                                            <h3>📈 Ways to Improve</h3>
                                            <div className="improvement-list">
                                                {analyticsData.improveableAreas.map((area, index) => (
                                                    <div key={index} className="improvement-item">
                                                        <span className="improvement-icon">✨</span>
                                                        <span>{area}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <div className="insight-card statistics">
                                            <h3>📊 Your Statistics</h3>
                                            <div className="stats-list">
                                                <div className="stat-item">
                                                    <span className="stat-label">Profile Views:</span>
                                                    <span className="stat-value">--</span>
                                                </div>
                                                <div className="stat-item">
                                                    <span className="stat-label">Messages Received:</span>
                                                    <span className="stat-value">--</span>
                                                </div>
                                                <div className="stat-item">
                                                    <span className="stat-label">Compatibility Range:</span>
                                                    <span className="stat-value">50-95%</span>
                                                </div>
                                                <div className="stat-item">
                                                    <span className="stat-label">Profile Completion:</span>
                                                    <span className="stat-value">85%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

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
                        existingAnswers={null}
                    />
                </Modal>

                {/* Edit Preferences Modal */}
                <Modal
                    isOpen={showEditModal}
                    onClose={() => setShowEditModal(false)}
                    title=""
                    size="large"
                    showHeader={false}
                >
                    <CompatibilityQuiz
                        onComplete={handleUpdatePreferences}
                        existingAnswers={userPreferences}
                        isEditing={true}
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

export default CompatibilityPage;
