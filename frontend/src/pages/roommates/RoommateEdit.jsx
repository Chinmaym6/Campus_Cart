import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import './RoommateEdit.css';

const RoommateEdit = () => {
    const { postId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        budget: '',
        location: '',
        moveInDate: '',
        preferences: {
            smoking: false,
            pets: false,
            guests: false,
            cleanliness: 5,
            noise: 5
        }
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchRoommatePost();
    }, [postId]);

    const fetchRoommatePost = async () => {
        try {
            const response = await axios.get(`/roommates/${postId}`);
            
            // Check if user owns this post
            if (response.data.post.userId !== user.id) {
                navigate('/unauthorized');
                return;
            }
            
            setFormData(response.data.post);
        } catch (error) {
            console.error('Error fetching roommate post:', error);
            navigate('/roommates');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            await axios.put(`/roommates/${postId}`, formData);
            navigate(`/roommates/${postId}`);
        } catch (error) {
            console.error('Error updating roommate post:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: {
                    ...prev[parent],
                    [child]: type === 'checkbox' ? checked : value
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            }));
        }
    };

    if (loading) {
        return <div className="loading">Loading roommate post...</div>;
    }

    return (
        <div className="roommate-edit-page">
            <div className="edit-header">
                <h1>Edit Roommate Post</h1>
                <p>Update your roommate preferences and details</p>
            </div>

            <form onSubmit={handleSubmit} className="edit-form">
                <div className="form-group">
                    <label htmlFor="title">Post Title</label>
                    <input
                        type="text"
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="description">Description</label>
                    <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={4}
                        required
                    />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="budget">Budget (per month)</label>
                        <input
                            type="number"
                            id="budget"
                            name="budget"
                            value={formData.budget}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="moveInDate">Move-in Date</label>
                        <input
                            type="date"
                            id="moveInDate"
                            name="moveInDate"
                            value={formData.moveInDate}
                            onChange={handleChange}
                            required
                        />
                    </div>
                </div>

                <div className="preferences-section">
                    <h3>Preferences</h3>
                    
                    <div className="checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                name="preferences.smoking"
                                checked={formData.preferences.smoking}
                                onChange={handleChange}
                            />
                            Smoking allowed
                        </label>
                        
                        <label>
                            <input
                                type="checkbox"
                                name="preferences.pets"
                                checked={formData.preferences.pets}
                                onChange={handleChange}
                            />
                            Pets allowed
                        </label>
                        
                        <label>
                            <input
                                type="checkbox"
                                name="preferences.guests"
                                checked={formData.preferences.guests}
                                onChange={handleChange}
                            />
                            Guests allowed
                        </label>
                    </div>
                </div>

                <div className="form-actions">
                    <button 
                        type="button" 
                        onClick={() => navigate(`/roommates/${postId}`)}
                        className="btn secondary"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        className="btn primary"
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default RoommateEdit;
