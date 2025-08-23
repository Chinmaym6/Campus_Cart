import React from 'react';
import RoommateCard from './RoommateCard';
import LoadingSpinner from '../common/LoadingSpinner';
import './RoommateGrid.css';

function RoommateGrid({ 
    roommates = [], 
    loading = false, 
    error = null,
    emptyMessage = "No roommate posts found",
    emptyDescription = "Try adjusting your search filters or check back later",
    showCompatibility = false,
    onSave,
    onContact,
    savedItems = [],
    compatibilityScores = {}
}) {
    
    if (loading) {
        return (
            <div className="roommate-grid-loading">
                <div className="loading-container">
                    <LoadingSpinner message="Finding roommate matches..." />
                    <div className="loading-skeleton">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="roommate-skeleton">
                                <div className="skeleton-header"></div>
                                <div className="skeleton-profile">
                                    <div className="skeleton-avatar"></div>
                                    <div className="skeleton-info">
                                        <div className="skeleton-line long"></div>
                                        <div className="skeleton-line short"></div>
                                    </div>
                                </div>
                                <div className="skeleton-content">
                                    <div className="skeleton-line long"></div>
                                    <div className="skeleton-line medium"></div>
                                    <div className="skeleton-line short"></div>
                                </div>
                                <div className="skeleton-footer"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="roommate-grid-error">
                <div className="error-container">
                    <div className="error-icon">⚠️</div>
                    <h3>Something went wrong</h3>
                    <p>{error}</p>
                    <button 
                        className="btn primary"
                        onClick={() => window.location.reload()}
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (roommates.length === 0) {
        return (
            <div className="roommate-grid-empty">
                <div className="empty-container">
                    <div className="empty-icon">🏠</div>
                    <h3>{emptyMessage}</h3>
                    <p>{emptyDescription}</p>
                    
                    <div className="empty-actions">
                        <button 
                            className="btn primary"
                            onClick={() => window.location.reload()}
                        >
                            🔄 Refresh
                        </button>
                        <a href="/roommates/create" className="btn secondary">
                            📝 Create Post
                        </a>
                    </div>

                    {/* Quick Tips */}
                    <div className="empty-tips">
                        <h4>💡 Tips to find roommates:</h4>
                        <ul>
                            <li>Complete your compatibility quiz for better matches</li>
                            <li>Add photos to your profile to stand out</li>
                            <li>Be flexible with your preferences</li>
                            <li>Check back regularly for new posts</li>
                        </ul>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="roommate-grid-container">
            <div className="roommate-grid">
                {roommates.map(roommate => (
                    <RoommateCard
                        key={roommate.id}
                        roommate={roommate}
                        showCompatibility={showCompatibility}
                        compatibilityScore={compatibilityScores[roommate.id]}
                        onSave={onSave}
                        onContact={onContact}
                        isSaved={savedItems.includes(roommate.id)}
                    />
                ))}
            </div>

            {/* Load More Indicator */}
            {roommates.length >= 20 && (
                <div className="load-more-container">
                    <div className="load-more-indicator">
                        <span>Showing {roommates.length} results</span>
                        <button className="btn outline">
                            Load More
                        </button>
                    </div>
                </div>
            )}

            {/* Grid Footer Stats */}
            <div className="grid-footer">
                <div className="results-stats">
                    <span className="stats-text">
                        {roommates.length} roommate{roommates.length !== 1 ? 's' : ''} found
                    </span>
                    
                    {showCompatibility && (
                        <div className="compatibility-stats">
                            <span className="stat-item">
                                🎯 {Object.values(compatibilityScores).filter(score => score >= 80).length} excellent matches
                            </span>
                            <span className="stat-item">
                                ⚡ {Object.values(compatibilityScores).filter(score => score >= 60).length} good matches
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default RoommateGrid;
