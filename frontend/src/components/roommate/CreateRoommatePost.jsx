import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import Toast from '../common/Toast';
import Modal from '../common/Modal';
import CompatibilityQuiz from './CompatibilityQuiz';
import axios from 'axios';
import './CreateRoommatePost.css';

function CreateRoommatePost() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showQuizModal, setShowQuizModal] = useState(false);
    const [userPreferences, setUserPreferences] = useState(null);
    const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
    
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'looking_for_roommate', // looking_for_roommate, have_space, looking_for_place
        budget_min: '',
        budget_max: '',
        location: '',
        move_in_date: '',
        lease_duration: '12_months',
        room_type: 'shared_room',
        amenities: [],
        preferences: {
            gender_preference: 'no_preference',
            age_range_min: 18,
            age_range_max: 30,
            student_only: true,
            smoking: 'no',
            pets: 'no_preference'
        },
        images: [],
        contact_method: 'platform_only'
    });

    const [errors, setErrors] = useState({});
    const [imageFiles, setImageFiles] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);

    useEffect(() => {
        checkUserPreferences();
    }, []);

    const checkUserPreferences = async () => {
        try {
            const response = await axios.get('/roommate-preferences');
            if (response.data.preferences) {
                setUserPreferences(response.data.preferences);
            }
        } catch (error) {
            console.log('No existing preferences found');
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        if (name.startsWith('preferences_')) {
            const prefKey = name.replace('preferences_', '');
            setFormData(prev => ({
                ...prev,
                preferences: {
                    ...prev.preferences,
                    [prefKey]: type === 'checkbox' ? checked : value
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            }));
        }
        
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleAmenitiesChange = (amenity) => {
        setFormData(prev => ({
            ...prev,
            amenities: prev.amenities.includes(amenity)
                ? prev.amenities.filter(a => a !== amenity)
                : [...prev.amenities, amenity]
        }));
    };

    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        
        if (files.length + imageFiles.length > 6) {
            showToast('Maximum 6 images allowed', 'warning');
            return;
        }

        const validFiles = [];
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        files.forEach(file => {
            if (!validTypes.includes(file.type)) {
                showToast(`${file.name} is not a valid image type`, 'error');
                return;
            }
            if (file.size > maxSize) {
                showToast(`${file.name} is too large (max 5MB)`, 'error');
                return;
            }
            validFiles.push(file);
        });

        if (validFiles.length > 0) {
            setImageFiles(prev => [...prev, ...validFiles]);
            
            validFiles.forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    setImagePreviews(prev => [...prev, e.target.result]);
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removeImage = (index) => {
        setImageFiles(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    const uploadImages = async () => {
        if (imageFiles.length === 0) return [];

        setUploading(true);
        const uploadedUrls = [];

        try {
            for (const file of imageFiles) {
                const formData = new FormData();
                formData.append('image', file);
                
                const response = await axios.post('/upload/roommate-image', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                
                uploadedUrls.push(response.data.url);
            }
        } catch (error) {
            console.error('Error uploading images:', error);
            throw new Error('Failed to upload images');
        } finally {
            setUploading(false);
        }

        return uploadedUrls;
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.title.trim()) newErrors.title = 'Title is required';
        if (!formData.description.trim()) newErrors.description = 'Description is required';
        if (!formData.budget_min || parseFloat(formData.budget_min) <= 0) {
            newErrors.budget_min = 'Please enter a valid minimum budget';
        }
        if (!formData.budget_max || parseFloat(formData.budget_max) <= 0) {
            newErrors.budget_max = 'Please enter a valid maximum budget';
        }
        if (parseFloat(formData.budget_min) > parseFloat(formData.budget_max)) {
            newErrors.budget_max = 'Maximum budget must be greater than minimum';
        }
        if (!formData.location.trim()) newErrors.location = 'Location is required';
        if (!formData.move_in_date) newErrors.move_in_date = 'Move-in date is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            showToast('Please fix the errors before submitting', 'error');
            return;
        }

        setLoading(true);

        try {
            const imageUrls = await uploadImages();
            
            const postData = {
                ...formData,
                images: imageUrls,
                budget_min: parseFloat(formData.budget_min),
                budget_max: parseFloat(formData.budget_max),
                compatibility_preferences: userPreferences
            };

            const response = await axios.post('/roommate-posts', postData);
            
            showToast('Roommate post created successfully!', 'success');
            
            setTimeout(() => {
                navigate(`/roommates/post/${response.data.post.id}`);
            }, 1500);
            
        } catch (error) {
            console.error('Error creating post:', error);
            showToast(
                error.response?.data?.message || 'Failed to create post. Please try again.',
                'error'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleQuizComplete = (preferences) => {
        setUserPreferences(preferences);
        setShowQuizModal(false);
        showToast('Compatibility preferences saved!', 'success');
    };

    const showToast = (message, type = 'info') => {
        setToast({ show: true, message, type });
    };

    const closeToast = () => {
        setToast({ show: false, message: '', type: 'info' });
    };

    const amenitiesList = [
        'gym', 'pool', 'laundry', 'parking', 'wifi', 'utilities_included',
        'furnished', 'air_conditioning', 'dishwasher', 'balcony', 'pet_friendly'
    ];

    return (
        <div className="create-roommate-post-page">
            <div className="create-post-container">
                <div className="page-header">
                    <h1>Find Your Perfect Roommate</h1>
                    <p>Create a detailed post to connect with compatible roommates</p>
                </div>

                <form onSubmit={handleSubmit} className="roommate-form">
                    {/* Basic Information */}
                    <div className="form-section">
                        <h2>Basic Information</h2>
                        
                        <div className="form-group">
                            <label htmlFor="type">I am...</label>
                            <select
                                id="type"
                                name="type"
                                value={formData.type}
                                onChange={handleInputChange}
                                className="form-select"
                            >
                                <option value="looking_for_roommate">Looking for a roommate to join me</option>
                                <option value="have_space">Have a space available</option>
                                <option value="looking_for_place">Looking for a place to live</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="title">Post Title *</label>
                            <input
                                type="text"
                                id="title"
                                name="title"
                                value={formData.title}
                                onChange={handleInputChange}
                                placeholder="e.g., Clean & friendly student looking for roommate near campus"
                                className={errors.title ? 'error' : ''}
                                maxLength={100}
                            />
                            {errors.title && <span className="error-text">{errors.title}</span>}
                            <small className="help-text">{formData.title.length}/100 characters</small>
                        </div>

                        <div className="form-group">
                            <label htmlFor="description">Description *</label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                placeholder="Tell potential roommates about yourself, your lifestyle, what you're looking for in a roommate..."
                                rows="5"
                                className={errors.description ? 'error' : ''}
                                maxLength={1000}
                            />
                            {errors.description && <span className="error-text">{errors.description}</span>}
                            <small className="help-text">{formData.description.length}/1000 characters</small>
                        </div>
                    </div>

                    {/* Budget & Timeline */}
                    <div className="form-section">
                        <h2>Budget & Timeline</h2>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="budget_min">Budget Range (Monthly) *</label>
                                <div className="budget-inputs">
                                    <div className="budget-input-wrapper">
                                        <span className="currency-symbol">$</span>
                                        <input
                                            type="number"
                                            id="budget_min"
                                            name="budget_min"
                                            value={formData.budget_min}
                                            onChange={handleInputChange}
                                            placeholder="Min"
                                            min="0"
                                            className={errors.budget_min ? 'error' : ''}
                                        />
                                    </div>
                                    <span className="budget-separator">to</span>
                                    <div className="budget-input-wrapper">
                                        <span className="currency-symbol">$</span>
                                        <input
                                            type="number"
                                            name="budget_max"
                                            value={formData.budget_max}
                                            onChange={handleInputChange}
                                            placeholder="Max"
                                            min="0"
                                            className={errors.budget_max ? 'error' : ''}
                                        />
                                    </div>
                                </div>
                                {(errors.budget_min || errors.budget_max) && (
                                    <span className="error-text">
                                        {errors.budget_min || errors.budget_max}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="move_in_date">Preferred Move-in Date *</label>
                                <input
                                    type="date"
                                    id="move_in_date"
                                    name="move_in_date"
                                    value={formData.move_in_date}
                                    onChange={handleInputChange}
                                    min={new Date().toISOString().split('T')[0]}
                                    className={errors.move_in_date ? 'error' : ''}
                                />
                                {errors.move_in_date && <span className="error-text">{errors.move_in_date}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="lease_duration">Lease Duration</label>
                                <select
                                    id="lease_duration"
                                    name="lease_duration"
                                    value={formData.lease_duration}
                                    onChange={handleInputChange}
                                    className="form-select"
                                >
                                    <option value="3_months">3 months</option>
                                    <option value="6_months">6 months</option>
                                    <option value="12_months">12 months (1 year)</option>
                                    <option value="flexible">Flexible</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Location & Housing */}
                    <div className="form-section">
                        <h2>Location & Housing</h2>
                        
                        <div className="form-group">
                            <label htmlFor="location">Preferred Location/Area *</label>
                            <input
                                type="text"
                                id="location"
                                name="location"
                                value={formData.location}
                                onChange={handleInputChange}
                                placeholder="e.g., Near campus, downtown, specific neighborhood"
                                className={errors.location ? 'error' : ''}
                            />
                            {errors.location && <span className="error-text">{errors.location}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="room_type">Room Type</label>
                            <select
                                id="room_type"
                                name="room_type"
                                value={formData.room_type}
                                onChange={handleInputChange}
                                className="form-select"
                            >
                                <option value="private_room">Private room</option>
                                <option value="shared_room">Shared room</option>
                                <option value="studio_share">Studio/efficiency share</option>
                                <option value="flexible">Flexible</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Desired Amenities</label>
                            <div className="amenities-grid">
                                {amenitiesList.map(amenity => (
                                    <button
                                        key={amenity}
                                        type="button"
                                        className={`amenity-btn ${formData.amenities.includes(amenity) ? 'selected' : ''}`}
                                        onClick={() => handleAmenitiesChange(amenity)}
                                    >
                                        {amenity.replace('_', ' ')}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Roommate Preferences */}
                    <div className="form-section">
                        <h2>Roommate Preferences</h2>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="preferences_gender_preference">Gender Preference</label>
                                <select
                                    id="preferences_gender_preference"
                                    name="preferences_gender_preference"
                                    value={formData.preferences.gender_preference}
                                    onChange={handleInputChange}
                                    className="form-select"
                                >
                                    <option value="no_preference">No preference</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="non_binary">Non-binary</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Age Range</label>
                                <div className="age-range-inputs">
                                    <input
                                        type="number"
                                        name="preferences_age_range_min"
                                        value={formData.preferences.age_range_min}
                                        onChange={handleInputChange}
                                        min="18"
                                        max="65"
                                        placeholder="Min"
                                    />
                                    <span>to</span>
                                    <input
                                        type="number"
                                        name="preferences_age_range_max"
                                        value={formData.preferences.age_range_max}
                                        onChange={handleInputChange}
                                        min="18"
                                        max="65"
                                        placeholder="Max"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="preferences_smoking">Smoking</label>
                                <select
                                    id="preferences_smoking"
                                    name="preferences_smoking"
                                    value={formData.preferences.smoking}
                                    onChange={handleInputChange}
                                    className="form-select"
                                >
                                    <option value="no">Non-smoker preferred</option>
                                    <option value="outside_only">Outside only OK</option>
                                    <option value="ok">Smoking OK</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="preferences_pets">Pets</label>
                                <select
                                    id="preferences_pets"
                                    name="preferences_pets"
                                    value={formData.preferences.pets}
                                    onChange={handleInputChange}
                                    className="form-select"
                                >
                                    <option value="no_preference">No preference</option>
                                    <option value="no_pets">No pets</option>
                                    <option value="ok_with_pets">OK with pets</option>
                                    <option value="have_pets">I have pets</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <div className="checkbox-wrapper">
                                <input
                                    type="checkbox"
                                    id="preferences_student_only"
                                    name="preferences_student_only"
                                    checked={formData.preferences.student_only}
                                    onChange={handleInputChange}
                                />
                                <label htmlFor="preferences_student_only">
                                    Students only (prefer other students)
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Compatibility Quiz */}
                    <div className="form-section">
                        <h2>Compatibility Matching</h2>
                        <div className="compatibility-section">
                            <div className="compatibility-info">
                                <h3>📊 Take our compatibility quiz</h3>
                                <p>
                                    Help us find your perfect roommate match by answering questions about your 
                                    lifestyle, habits, and preferences. This will improve your match quality significantly!
                                </p>
                                {userPreferences ? (
                                    <div className="quiz-completed">
                                        <span className="quiz-status">✅ Compatibility quiz completed</span>
                                        <button
                                            type="button"
                                            className="btn secondary small"
                                            onClick={() => setShowQuizModal(true)}
                                        >
                                            Update Preferences
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        className="btn primary"
                                        onClick={() => setShowQuizModal(true)}
                                    >
                                        Take Compatibility Quiz
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Photos */}
                    <div className="form-section">
                        <h2>Photos (Optional)</h2>
                        <p className="section-description">
                            Add photos of the space, room, or yourself to make your post more appealing
                        </p>
                        
                        <div className="image-upload-section">
                            <div className="image-previews">
                                {imagePreviews.map((preview, index) => (
                                    <div key={index} className="image-preview">
                                        <img src={preview} alt={`Preview ${index + 1}`} />
                                        <button
                                            type="button"
                                            className="remove-image-btn"
                                            onClick={() => removeImage(index)}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                                
                                {imagePreviews.length < 6 && (
                                    <label className="image-upload-btn">
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/jpeg,image/jpg,image/png,image/webp"
                                            onChange={handleImageUpload}
                                            style={{ display: 'none' }}
                                        />
                                        <div className="upload-placeholder">
                                            <span className="upload-icon">📷</span>
                                            <span>Add Photos</span>
                                        </div>
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Contact Preferences */}
                    <div className="form-section">
                        <h2>Contact Preferences</h2>
                        
                        <div className="form-group">
                            <label htmlFor="contact_method">How should people contact you?</label>
                            <select
                                id="contact_method"
                                name="contact_method"
                                value={formData.contact_method}
                                onChange={handleInputChange}
                                className="form-select"
                            >
                                <option value="platform_only">Through Campus Cart messages only</option>
                                <option value="email_ok">Campus Cart + email OK</option>
                                <option value="phone_ok">Campus Cart + phone OK</option>
                                <option value="any">Any contact method</option>
                            </select>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn secondary"
                            onClick={() => navigate('/roommates')}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn primary large"
                            disabled={loading || uploading}
                        >
                            {loading ? (
                                <>
                                    <LoadingSpinner size="small" />
                                    Creating Post...
                                </>
                            ) : uploading ? (
                                <>
                                    <LoadingSpinner size="small" />
                                    Uploading Images...
                                </>
                            ) : (
                                '🚀 Create Roommate Post'
                            )}
                        </button>
                    </div>
                </form>
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
    );
}

export default CreateRoommatePost;
