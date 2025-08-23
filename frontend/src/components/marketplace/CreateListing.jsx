import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import Toast from '../common/Toast';
import axios from 'axios';
import './CreateListing.css';

function CreateListing() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
    
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: '',
        condition: 'good',
        category_id: '',
        images: [],
        location_address: user?.location_address || '',
        is_negotiable: true,
        isbn: '', // For textbooks
        brand: '',
        model: ''
    });

    const [errors, setErrors] = useState({});
    const [imageFiles, setImageFiles] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await axios.get('/categories');
            setCategories(response.data.categories || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        
        if (files.length + imageFiles.length > 6) {
            showToast('Maximum 6 images allowed', 'warning');
            return;
        }

        // Validate file types and sizes
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
            
            // Create previews
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
                
                const response = await axios.post('/upload/image', formData, {
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
        if (!formData.price || parseFloat(formData.price) <= 0) {
            newErrors.price = 'Please enter a valid price';
        }
        if (!formData.category_id) newErrors.category_id = 'Please select a category';
        if (!formData.condition) newErrors.condition = 'Please select item condition';

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
            // Upload images first
            const imageUrls = await uploadImages();
            
            // Create listing
            const listingData = {
                ...formData,
                images: imageUrls,
                price: parseFloat(formData.price)
            };

            const response = await axios.post('/items', listingData);
            
            showToast('Listing created successfully!', 'success');
            
            // Redirect to the new item
            setTimeout(() => {
                navigate(`/marketplace/item/${response.data.item.id}`);
            }, 1500);
            
        } catch (error) {
            console.error('Error creating listing:', error);
            showToast(
                error.response?.data?.message || 'Failed to create listing. Please try again.',
                'error'
            );
        } finally {
            setLoading(false);
        }
    };

    const showToast = (message, type = 'info') => {
        setToast({ show: true, message, type });
    };

    const closeToast = () => {
        setToast({ show: false, message: '', type: 'info' });
    };

    const selectedCategory = categories.find(cat => cat.id === formData.category_id);
    const isTextbook = selectedCategory?.slug === 'textbooks';

    return (
        <div className="create-listing-page">
            <div className="create-listing-container">
                <div className="page-header">
                    <h1>Create New Listing</h1>
                    <p>Sell your items to fellow students on campus</p>
                </div>

                <form onSubmit={handleSubmit} className="listing-form">
                    {/* Basic Information */}
                    <div className="form-section">
                        <h2>Basic Information</h2>
                        
                        <div className="form-group">
                            <label htmlFor="title">Title *</label>
                            <input
                                type="text"
                                id="title"
                                name="title"
                                value={formData.title}
                                onChange={handleInputChange}
                                placeholder="e.g., MacBook Pro 13-inch 2022"
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
                                placeholder="Describe your item's condition, features, and any relevant details..."
                                rows="4"
                                className={errors.description ? 'error' : ''}
                                maxLength={1000}
                            />
                            {errors.description && <span className="error-text">{errors.description}</span>}
                            <small className="help-text">{formData.description.length}/1000 characters</small>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="category_id">Category *</label>
                                <select
                                    id="category_id"
                                    name="category_id"
                                    value={formData.category_id}
                                    onChange={handleInputChange}
                                    className={errors.category_id ? 'error' : ''}
                                >
                                    <option value="">Select a category</option>
                                    {categories.map(category => (
                                        <option key={category.id} value={category.id}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.category_id && <span className="error-text">{errors.category_id}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="condition">Condition *</label>
                                <select
                                    id="condition"
                                    name="condition"
                                    value={formData.condition}
                                    onChange={handleInputChange}
                                    className={errors.condition ? 'error' : ''}
                                >
                                    <option value="new">New</option>
                                    <option value="like_new">Like New</option>
                                    <option value="good">Good</option>
                                    <option value="fair">Fair</option>
                                    <option value="poor">Poor</option>
                                </select>
                                {errors.condition && <span className="error-text">{errors.condition}</span>}
                            </div>
                        </div>
                    </div>

                    {/* Pricing */}
                    <div className="form-section">
                        <h2>Pricing</h2>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="price">Price *</label>
                                <div className="price-input-wrapper">
                                    <span className="currency-symbol">$</span>
                                    <input
                                        type="number"
                                        id="price"
                                        name="price"
                                        value={formData.price}
                                        onChange={handleInputChange}
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                        className={errors.price ? 'error' : ''}
                                    />
                                </div>
                                {errors.price && <span className="error-text">{errors.price}</span>}
                            </div>

                            <div className="form-group">
                                <div className="checkbox-wrapper">
                                    <input
                                        type="checkbox"
                                        id="is_negotiable"
                                        name="is_negotiable"
                                        checked={formData.is_negotiable}
                                        onChange={handleInputChange}
                                    />
                                    <label htmlFor="is_negotiable">Price is negotiable</label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Additional Details */}
                    <div className="form-section">
                        <h2>Additional Details</h2>
                        
                        {isTextbook && (
                            <div className="form-group">
                                <label htmlFor="isbn">ISBN (for textbooks)</label>
                                <input
                                    type="text"
                                    id="isbn"
                                    name="isbn"
                                    value={formData.isbn}
                                    onChange={handleInputChange}
                                    placeholder="e.g., 9780123456789"
                                />
                            </div>
                        )}

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="brand">Brand</label>
                                <input
                                    type="text"
                                    id="brand"
                                    name="brand"
                                    value={formData.brand}
                                    onChange={handleInputChange}
                                    placeholder="e.g., Apple, Samsung, Nike"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="model">Model</label>
                                <input
                                    type="text"
                                    id="model"
                                    name="model"
                                    value={formData.model}
                                    onChange={handleInputChange}
                                    placeholder="e.g., MacBook Pro, Galaxy S23"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="location_address">Location</label>
                            <input
                                type="text"
                                id="location_address"
                                name="location_address"
                                value={formData.location_address}
                                onChange={handleInputChange}
                                placeholder="Where can buyers find you?"
                            />
                        </div>
                    </div>

                    {/* Images */}
                    <div className="form-section">
                        <h2>Photos</h2>
                        <p className="section-description">
                            Add up to 6 photos. Good photos help your item sell faster!
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
                            
                            <div className="upload-tips">
                                <h4>Photo Tips:</h4>
                                <ul>
                                    <li>Use good lighting and multiple angles</li>
                                    <li>Show any flaws or damage clearly</li>
                                    <li>Maximum 6 photos, 5MB each</li>
                                    <li>Supported formats: JPG, PNG, WebP</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn secondary"
                            onClick={() => navigate(-1)}
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
                                    Creating Listing...
                                </>
                            ) : uploading ? (
                                <>
                                    <LoadingSpinner size="small" />
                                    Uploading Images...
                                </>
                            ) : (
                                '🚀 Create Listing'
                            )}
                        </button>
                    </div>
                </form>
            </div>

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

export default CreateListing;
