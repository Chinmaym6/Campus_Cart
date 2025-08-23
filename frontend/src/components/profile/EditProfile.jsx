import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../common/LoadingSpinner';
import Toast from '../common/Toast';
import Modal from '../common/Modal';
import axios from 'axios';
import './EditProfile.css';

function EditProfile() {
    const { user, checkAuth } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
    
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        student_id: '',
        graduation_year: new Date().getFullYear(),
        bio: '',
        location_address: '',
        profile_picture_url: '',
        social_links: {
            instagram: '',
            facebook: '',
            twitter: '',
            linkedin: ''
        },
        privacy_settings: {
            show_email: false,
            show_phone: false,
            show_location: true
        }
    });

    const [errors, setErrors] = useState({});
    const [profileImage, setProfileImage] = useState(null);
    const [imagePreview, setImagePreview] = useState('');

    useEffect(() => {
        if (user) {
            loadUserData();
        }
    }, [user]);

    const loadUserData = async () => {
        try {
            const response = await axios.get('/users/profile');
            const userData = response.data.user;
            
            setFormData({
                first_name: userData.first_name || '',
                last_name: userData.last_name || '',
                email: userData.email || '',
                phone: userData.phone || '',
                student_id: userData.student_id || '',
                graduation_year: userData.graduation_year || new Date().getFullYear(),
                bio: userData.bio || '',
                location_address: userData.location_address || '',
                profile_picture_url: userData.profile_picture_url || '',
                social_links: userData.social_links || {
                    instagram: '',
                    facebook: '',
                    twitter: '',
                    linkedin: ''
                },
                privacy_settings: userData.privacy_settings || {
                    show_email: false,
                    show_phone: false,
                    show_location: true
                }
            });
            
            setImagePreview(userData.profile_picture_url || '');
        } catch (error) {
            console.error('Error loading user data:', error);
            showToast('Error loading profile data', 'error');
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        if (name.startsWith('social_')) {
            const socialKey = name.replace('social_', '');
            setFormData(prev => ({
                ...prev,
                social_links: {
                    ...prev.social_links,
                    [socialKey]: value
                }
            }));
        } else if (name.startsWith('privacy_')) {
            const privacyKey = name.replace('privacy_', '');
            setFormData(prev => ({
                ...prev,
                privacy_settings: {
                    ...prev.privacy_settings,
                    [privacyKey]: checked
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

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!validTypes.includes(file.type)) {
            showToast('Please upload a valid image (JPG, PNG, WebP)', 'error');
            return;
        }

        if (file.size > maxSize) {
            showToast('Image size must be less than 5MB', 'error');
            return;
        }

        setProfileImage(file);
        
        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => setImagePreview(e.target.result);
        reader.readAsDataURL(file);
    };

    const uploadProfileImage = async () => {
        if (!profileImage) return formData.profile_picture_url;

        setUploading(true);
        try {
            const formDataUpload = new FormData();
            formDataUpload.append('image', profileImage);
            
            const response = await axios.post('/upload/profile-image', formDataUpload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            return response.data.url;
        } catch (error) {
            console.error('Error uploading image:', error);
            throw new Error('Failed to upload profile image');
        } finally {
            setUploading(false);
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email';
        }
        if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
        if (!formData.student_id.trim()) newErrors.student_id = 'Student ID is required';

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
            // Upload profile image if changed
            const profileImageUrl = await uploadProfileImage();
            
            // Update profile
            const updateData = {
                ...formData,
                profile_picture_url: profileImageUrl
            };

            await axios.put('/users/profile', updateData);
            
            showToast('Profile updated successfully!', 'success');
            
            // Refresh auth context
            await checkAuth();
            
            // Redirect after delay
            setTimeout(() => {
                navigate('/dashboard');
            }, 1500);
            
        } catch (error) {
            console.error('Error updating profile:', error);
            showToast(
                error.response?.data?.message || 'Failed to update profile. Please try again.',
                'error'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        try {
            await axios.delete('/users/account');
            showToast('Account deleted successfully', 'success');
            // Logout and redirect will be handled by auth context
            setTimeout(() => window.location.href = '/', 1500);
        } catch (error) {
            showToast('Error deleting account', 'error');
        }
        setShowDeleteModal(false);
    };

    const showToast = (message, type = 'info') => {
        setToast({ show: true, message, type });
    };

    const closeToast = () => {
        setToast({ show: false, message: '', type: 'info' });
    };

    return (
        <div className="edit-profile-page">
            <div className="edit-profile-container">
                <div className="page-header">
                    <h1>Edit Profile</h1>
                    <p>Update your personal information and preferences</p>
                </div>

                <form onSubmit={handleSubmit} className="profile-form">
                    {/* Profile Picture Section */}
                    <div className="form-section">
                        <h2>Profile Picture</h2>
                        
                        <div className="profile-picture-section">
                            <div className="current-picture">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Profile" className="profile-img" />
                                ) : (
                                    <div className="no-picture">
                                        <span className="no-picture-icon">👤</span>
                                        <span>No Picture</span>
                                    </div>
                                )}
                            </div>
                            
                            <div className="picture-actions">
                                <label className="upload-btn">
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png,image/webp"
                                        onChange={handleImageUpload}
                                        style={{ display: 'none' }}
                                    />
                                    📷 Change Picture
                                </label>
                                {imagePreview && (
                                    <button
                                        type="button"
                                        className="remove-btn"
                                        onClick={() => {
                                            setImagePreview('');
                                            setProfileImage(null);
                                            setFormData(prev => ({ ...prev, profile_picture_url: '' }));
                                        }}
                                    >
                                        🗑️ Remove
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Basic Information */}
                    <div className="form-section">
                        <h2>Basic Information</h2>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="first_name">First Name *</label>
                                <input
                                    type="text"
                                    id="first_name"
                                    name="first_name"
                                    value={formData.first_name}
                                    onChange={handleInputChange}
                                    className={errors.first_name ? 'error' : ''}
                                    maxLength={50}
                                />
                                {errors.first_name && <span className="error-text">{errors.first_name}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="last_name">Last Name</label>
                                <input
                                    type="text"
                                    id="last_name"
                                    name="last_name"
                                    value={formData.last_name}
                                    onChange={handleInputChange}
                                    maxLength={50}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">Email *</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                className={errors.email ? 'error' : ''}
                            />
                            {errors.email && <span className="error-text">{errors.email}</span>}
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="phone">Phone Number *</label>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    className={errors.phone ? 'error' : ''}
                                />
                                {errors.phone && <span className="error-text">{errors.phone}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="student_id">Student ID *</label>
                                <input
                                    type="text"
                                    id="student_id"
                                    name="student_id"
                                    value={formData.student_id}
                                    onChange={handleInputChange}
                                    className={errors.student_id ? 'error' : ''}
                                    maxLength={20}
                                />
                                {errors.student_id && <span className="error-text">{errors.student_id}</span>}
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="graduation_year">Graduation Year</label>
                            <select
                                id="graduation_year"
                                name="graduation_year"
                                value={formData.graduation_year}
                                onChange={handleInputChange}
                            >
                                {[...Array(7)].map((_, i) => {
                                    const year = new Date().getFullYear() + i;
                                    return <option key={year} value={year}>{year}</option>
                                })}
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="bio">Bio</label>
                            <textarea
                                id="bio"
                                name="bio"
                                value={formData.bio}
                                onChange={handleInputChange}
                                placeholder="Tell us about yourself..."
                                rows="4"
                                maxLength={500}
                            />
                            <small className="help-text">{formData.bio.length}/500 characters</small>
                        </div>

                        <div className="form-group">
                            <label htmlFor="location_address">Location</label>
                            <input
                                type="text"
                                id="location_address"
                                name="location_address"
                                value={formData.location_address}
                                onChange={handleInputChange}
                                placeholder="Your address or general location"
                                maxLength={200}
                            />
                        </div>
                    </div>

                    {/* Social Links */}
                    <div className="form-section">
                        <h2>Social Links</h2>
                        <p className="section-description">Connect your social media profiles (optional)</p>
                        
                        <div className="social-inputs">
                            <div className="form-group">
                                <label htmlFor="social_instagram">Instagram</label>
                                <div className="social-input-wrapper">
                                    <span className="social-prefix">@</span>
                                    <input
                                        type="text"
                                        id="social_instagram"
                                        name="social_instagram"
                                        value={formData.social_links.instagram}
                                        onChange={handleInputChange}
                                        placeholder="username"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="social_facebook">Facebook</label>
                                <div className="social-input-wrapper">
                                    <span className="social-prefix">fb.com/</span>
                                    <input
                                        type="text"
                                        id="social_facebook"
                                        name="social_facebook"
                                        value={formData.social_links.facebook}
                                        onChange={handleInputChange}
                                        placeholder="username"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="social_twitter">Twitter</label>
                                <div className="social-input-wrapper">
                                    <span className="social-prefix">@</span>
                                    <input
                                        type="text"
                                        id="social_twitter"
                                        name="social_twitter"
                                        value={formData.social_links.twitter}
                                        onChange={handleInputChange}
                                        placeholder="username"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="social_linkedin">LinkedIn</label>
                                <div className="social-input-wrapper">
                                    <span className="social-prefix">linkedin.com/in/</span>
                                    <input
                                        type="text"
                                        id="social_linkedin"
                                        name="social_linkedin"
                                        value={formData.social_links.linkedin}
                                        onChange={handleInputChange}
                                        placeholder="username"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Privacy Settings */}
                    <div className="form-section">
                        <h2>Privacy Settings</h2>
                        <p className="section-description">Control what information is visible to other users</p>
                        
                        <div className="privacy-options">
                            <div className="privacy-item">
                                <div className="privacy-info">
                                    <label htmlFor="privacy_show_email">Show Email Address</label>
                                    <small>Allow other users to see your email address</small>
                                </div>
                                <input
                                    type="checkbox"
                                    id="privacy_show_email"
                                    name="privacy_show_email"
                                    checked={formData.privacy_settings.show_email}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="privacy-item">
                                <div className="privacy-info">
                                    <label htmlFor="privacy_show_phone">Show Phone Number</label>
                                    <small>Allow other users to see your phone number</small>
                                </div>
                                <input
                                    type="checkbox"
                                    id="privacy_show_phone"
                                    name="privacy_show_phone"
                                    checked={formData.privacy_settings.show_phone}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="privacy-item">
                                <div className="privacy-info">
                                    <label htmlFor="privacy_show_location">Show Location</label>
                                    <small>Allow other users to see your general location</small>
                                </div>
                                <input
                                    type="checkbox"
                                    id="privacy_show_location"
                                    name="privacy_show_location"
                                    checked={formData.privacy_settings.show_location}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Form Actions */}
                    <div className="form-actions">
                        <div className="action-group">
                            <button
                                type="button"
                                className="btn secondary"
                                onClick={() => navigate('/dashboard')}
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
                                        Saving...
                                    </>
                                ) : uploading ? (
                                    <>
                                        <LoadingSpinner size="small" />
                                        Uploading...
                                    </>
                                ) : (
                                    '💾 Save Changes'
                                )}
                            </button>
                        </div>
                        
                        <div className="danger-zone">
                            <button
                                type="button"
                                className="btn danger"
                                onClick={() => setShowDeleteModal(true)}
                            >
                                🗑️ Delete Account
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* Delete Account Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="Delete Account"
                size="medium"
            >
                <div className="delete-modal-content">
                    <div className="warning-icon">⚠️</div>
                    <h3>Are you sure?</h3>
                    <p>This action cannot be undone. All your data including:</p>
                    <ul>
                        <li>Profile information</li>
                        <li>Listings and messages</li>
                        <li>Purchase history</li>
                        <li>Saved items</li>
                    </ul>
                    <p>Will be permanently deleted.</p>
                    
                    <div className="modal-actions">
                        <button 
                            className="btn secondary"
                            onClick={() => setShowDeleteModal(false)}
                        >
                            Cancel
                        </button>
                        <button 
                            className="btn danger"
                            onClick={handleDeleteAccount}
                        >
                            🗑️ Delete Permanently
                        </button>
                    </div>
                </div>
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

export default EditProfile;
