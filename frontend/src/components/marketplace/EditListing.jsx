import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import Toast from '../common/Toast';
import Modal from '../common/Modal';
import axios from 'axios';
import './EditListing.css';

function EditListing() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
    
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: '',
        condition: 'good',
        category_id: '',
        images: [],
        location_address: '',
        is_negotiable: true,
        isbn: '',
        brand: '',
        model: '',
        status: 'available'
    });

    const [originalData, setOriginalData] = useState({});
    const [errors, setErrors] = useState({});
    const [newImageFiles, setNewImageFiles] = useState([]);
    const [newImagePreviews, setNewImagePreviews] = useState([]);
    const [imagesToDelete, setImagesToDelete] = useState([]);

    useEffect(() => {
        fetchItemData();
        fetchCategories();
    }, [id]);

    const fetchItemData = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/items/${id}`);
            const item = response.data.item;
            
            // Check if user owns this item
            if (item.seller_id !== user?.id) {
                navigate('/dashboard');
                return;
            }
            
            const itemData = {
                title: item.title || '',
                description: item.description || '',
                price: item.price ? item.price.toString() : '',
                condition: item.condition || 'good',
                category_id: item.category_id || '',
                images: item.images || [],
                location_address: item.location_address || '',
                is_negotiable: item.is_negotiable !== undefined ? item.is_negotiable : true,
                isbn: item.isbn || '',
                brand: item.brand || '',
                model: item.model || '',
                status: item.status || 'available'
            };
            
            setFormData(itemData);
            setOriginalData(itemData);
            
        } catch (error) {
            console.error('Error fetching item:', error);
            if (error.response?.status === 404) {
                navigate('/marketplace');
            } else {
                showToast('Error loading item data', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

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
        const totalImages = formData.images.length + newImageFiles.length;
        
        if (files.length + totalImages > 6) {
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
            setNewImageFiles(prev => [...prev, ...validFiles]);
            
            // Create previews
            validFiles.forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    setNewImagePreviews(prev => [...prev, e.target.result]);
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removeExistingImage = (index) => {
        const imageToRemove = formData.images[index];
        setImagesToDelete(prev => [...prev, imageToRemove]);
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
    };

    const removeNewImage = (index) => {
        setNewImageFiles(prev => prev.filter((_, i) => i !== index));
        setNewImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    const uploadNewImages = async () => {
        if (newImageFiles.length === 0) return [];

        setUploading(true);
        const uploadedUrls = [];

        try {
            for (const file of newImageFiles) {
                const formDataUpload = new FormData();
                formDataUpload.append('image', file);
                
                const response = await axios.post('/upload/image', formDataUpload, {
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

    const hasChanges = () => {
        return JSON.stringify(formData) !== JSON.stringify(originalData) || 
               newImageFiles.length > 0 || 
               imagesToDelete.length > 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            showToast('Please fix the errors before submitting', 'error');
            return;
        }

        if (!hasChanges()) {
            showToast('No changes detected', 'info');
            return;
        }

        setSaving(true);

        try {
            // Upload new images first
            const newImageUrls = await uploadNewImages();
            
            // Combine existing and new images
            const allImages = [...formData.images, ...newImageUrls];
            
            // Prepare update data
            const updateData = {
                ...formData,
                images: allImages,
                price: parseFloat(formData.price),
                imagesToDelete: imagesToDelete
            };

            await axios.put(`/items/${id}`, updateData);
            
            showToast('Listing updated successfully!', 'success');
            
            // Reset tracking arrays
            setNewImageFiles([]);
            setNewImagePreviews([]);
            setImagesToDelete([]);
            setOriginalData(formData);
            
            // Redirect after a delay
            setTimeout(() => {
                navigate(`/marketplace/item/${id}`);
            }, 1500);
            
        } catch (error) {
            console.error('Error updating listing:', error);
            showToast(
                error.response?.data?.message || 'Failed to update listing. Please try again.',
                'error'
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        try {
            await axios.delete(`/items/${id}`);
            showToast('Listing deleted successfully', 'success');
            setTimeout(() => navigate('/dashboard'), 1500);
        } catch (error) {
            console.error('Error deleting listing:', error);
            showToast('Error deleting listing', 'error');
        }
        setShowDeleteModal(false);
    };

    const handleStatusChange = async (newStatus) => {
        try {
            await axios.patch(`/items/${id}/status`, { status: newStatus });
            setFormData(prev => ({ ...prev, status: newStatus }));
            showToast(
                `Item marked as ${newStatus === 'sold' ? 'sold' : 'available'}`, 
                'success'
            );
        } catch (error) {
            showToast('Error updating item status', 'error');
        }
    };

    const showToast = (message, type = 'info') => {
        setToast({ show: true, message, type });
    };

    const closeToast = () => {
        setToast({ show: false, message: '', type: 'info' });
    };

    if (loading) {
        return <LoadingSpinner message="Loading item data..." overlay />;
    }

    const selectedCategory = categories.find(cat => cat.id === formData.category_id);
    const isTextbook = selectedCategory?.slug === 'textbooks';

    return (
        <div className="edit-listing-page">
            <div className="edit-listing-container">
                <div className="page-header">
                    <h1>Edit Listing</h1>
                    <p>Update your item details</p>
                    
                    <div className="header-actions">
                        <div className="status-controls">
                            <button
                                className={`status-btn ${formData.status === 'available' ? 'active' : ''}`}
                                onClick={() => handleStatusChange('available')}
                                disabled={formData.status === 'available'}
                            >
                                ✅ Mark Available
                            </button>
                            <button
                                className={`status-btn ${formData.status === 'sold' ? 'active' : ''}`}
                                onClick={() => handleStatusChange('sold')}
                                disabled={formData.status === 'sold'}
                            >
                                💰 Mark Sold
                            </button>
                        </div>
                        
                        <button
                            className="delete-btn"
                            onClick={() => setShowDeleteModal(true)}
                        >
                            🗑️ Delete
                        </button>
                    </div>
                </div>

                {/* Status Indicator */}
                <div className={`status-indicator ${formData.status}`}>
                    <span className="status-icon">
                        {formData.status === 'available' ? '✅' : '💰'}
                    </span>
                    <span className="status-text">
                        Item is {formData.status === 'available' ? 'available for sale' : 'marked as sold'}
                    </span>
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
                            Manage your item photos. You can have up to 6 photos total.
                        </p>
                        
                        <div className="image-management-section">
                            <h3>Current Photos</h3>
                            <div className="current-images">
                                {formData.images.length > 0 ? (
                                    <div className="image-previews">
                                        {formData.images.map((image, index) => (
                                            <div key={index} className="image-preview existing">
                                                <img src={image} alt={`Current ${index + 1}`} />
                                                <button
                                                    type="button"
                                                    className="remove-image-btn"
                                                    onClick={() => removeExistingImage(index)}
                                                >
                                                    ×
                                                </button>
                                                <span className="image-label">Current</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="no-images">
                                        <span>No current images</span>
                                    </div>
                                )}
                            </div>

                            {newImagePreviews.length > 0 && (
                                <>
                                    <h3>New Photos</h3>
                                    <div className="image-previews">
                                        {newImagePreviews.map((preview, index) => (
                                            <div key={index} className="image-preview new">
                                                <img src={preview} alt={`New ${index + 1}`} />
                                                <button
                                                    type="button"
                                                    className="remove-image-btn"
                                                    onClick={() => removeNewImage(index)}
                                                >
                                                    ×
                                                </button>
                                                <span className="image-label">New</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {(formData.images.length + newImageFiles.length) < 6 && (
                                <div className="add-images-section">
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
                                            <span>Add More Photos</span>
                                        </div>
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn secondary"
                            onClick={() => navigate(`/marketplace/item/${id}`)}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={`btn primary large ${!hasChanges() ? 'disabled' : ''}`}
                            disabled={saving || uploading || !hasChanges()}
                        >
                            {saving ? (
                                <>
                                    <LoadingSpinner size="small" />
                                    Saving Changes...
                                </>
                            ) : uploading ? (
                                <>
                                    <LoadingSpinner size="small" />
                                    Uploading Images...
                                </>
                            ) : (
                                '💾 Save Changes'
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="Delete Listing"
                size="medium"
            >
                <div className="delete-modal-content">
                    <p>Are you sure you want to delete this listing?</p>
                    <p className="warning-text">
                        ⚠️ This action cannot be undone. The listing will be permanently removed.
                    </p>
                    <div className="modal-actions">
                        <button 
                            className="btn secondary"
                            onClick={() => setShowDeleteModal(false)}
                        >
                            Cancel
                        </button>
                        <button 
                            className="btn danger"
                            onClick={handleDelete}
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

export default EditListing;
