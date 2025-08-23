import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import './MyRoommatePost.css';

const MyRoommatePost = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [myPost, setMyPost] = useState(null);
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMyPost();
        fetchMatches();
    }, []);

    const fetchMyPost = async () => {
        try {
            const response = await axios.get('/roommates/my-post');
            setMyPost(response.data.post);
        } catch (error) {
            console.error('Error fetching my post:', error);
        }
    };

    const fetchMatches = async () => {
        try {
            const response = await axios.get('/roommates/matches');
            setMatches(response.data.matches || []);
        } catch (error) {
            console.error('Error fetching matches:', error);
        } finally {
            setLoading(false);
        }
    };

    const deletePost = async () => {
        if (window.confirm('Are you sure you want to delete your roommate post?')) {
            try {
                await axios.delete(`/roommates/${myPost.id}`);
                setMyPost(null);
            } catch (error) {
                console.error('Error deleting post:', error);
            }
        }
    };

    if (loading) {
        return <div className="loading">Loading your roommate post...</div>;
    }

    return (
        <div className="my-roommate-post-page">
            <div className="page-header">
                <h1>My Roommate Post</h1>
                <p>Manage your roommate preferences and view potential matches</p>
            </div>

            {myPost ? (
                <div className="current-post-section">
                    <div className="post-header">
                        <h2>Your Current Post</h2>
                        <div className="post-actions">
                            <Link 
                                to={`/roommates/${myPost.id}/edit`} 
                                className="btn secondary"
                            >
                                Edit Post
                            </Link>
                            <button 
                                onClick={deletePost} 
                                className="btn danger"
                            >
                                Delete Post
                            </button>
                        </div>
                    </div>
                    
                    <div className="post-card">
                        <div className="post-content">
                            <h3>{myPost.title}</h3>
                            <p className="post-description">{myPost.description}</p>
                            <div className="post-details">
                                <span className="budget">Budget: ${myPost.budget}/month</span>
                                <span className="move-date">Move-in: {new Date(myPost.moveInDate).toLocaleDateString()}</span>
                            </div>
                        </div>
                        
                        <div className="post-stats">
                            <div className="stat">
                                <span className="stat-number">{matches.length}</span>
                                <span className="stat-label">Matches</span>
                            </div>
                            <div className="stat">
                                <span className="stat-number">{myPost.views || 0}</span>
                                <span className="stat-label">Views</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="matches-section">
                        <div className="matches-header">
                            <h3>Your Matches ({matches.length})</h3>
                            <Link to="/roommates/matches" className="view-all-link">
                                View All →
                            </Link>
                        </div>
                        
                        {matches.length > 0 ? (
                            <div className="matches-grid">
                                {matches.slice(0, 3).map(match => (
                                    <div key={match.id} className="match-card">
                                        <div className="match-avatar">
                                            <img 
                                                src={match.user.profilePicture || '/default-avatar.png'} 
                                                alt={match.user.firstName}
                                            />
                                        </div>
                                        <div className="match-info">
                                            <h4>{match.user.firstName} {match.user.lastName}</h4>
                                            <p className="match-title">{match.title}</p>
                                            <div className="compatibility-score">
                                                <span className="score">{match.compatibilityScore}%</span>
                                                <span className="score-label">Match</span>
                                            </div>
                                        </div>
                                        <div className="match-actions">
                                            <Link 
                                                to={`/roommates/${match.id}`}
                                                className="btn-small primary"
                                            >
                                                View Profile
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="no-matches">
                                <p>No matches found yet. Try updating your preferences!</p>
                                <Link to="/roommates/compatibility" className="btn secondary">
                                    Take Compatibility Quiz
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="no-post-section">
                    <div className="empty-state">
                        <div className="empty-icon">🏠</div>
                        <h3>You haven't created a roommate post yet</h3>
                        <p>Create a post to find compatible roommates and get matched with other students</p>
                        <div className="empty-actions">
                            <Link to="/roommates/create" className="btn primary">
                                Create Roommate Post
                            </Link>
                            <Link to="/roommates/compatibility" className="btn secondary">
                                Take Compatibility Quiz First
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyRoommatePost;
