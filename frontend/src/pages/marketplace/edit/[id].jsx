import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { Helmet } from 'react-helmet-async';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import Toast from '../../../components/common/Toast';
import Modal from '../../../components/common/Modal';
import axios from 'axios';
import './EditListing.css';

function EditListingPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [categories, setCategories] = useState([]);
    const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
    
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: '',
        category_id: '',
        condition: 'good',
        location_address: '',
        is_negotiable: false,
        images: []
    });
    
    const [errors, setErrors] = useState({});
    const [imageFiles, setImageFiles] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [removedImages, setRemovedImages] = useState([]);

    useEffect(() => {
        if (id) {
            fetchItem();
            fetchCategories();
        }
    }, [id]);

    const fetchItem = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/items/${id}`);
            const itemData = response.data.item;
            
            // Check if user owns this item
            if (!user || itemData.user_id !== user.id) {
                navigate('/marketplace');
                return;
            }
            
            setItem(itemData);
            setFormData({
                title: itemData.title || '',
                description: itemData.description || '',
                price: itemData.price || '',
                category_id: itemData.category_id || '',
                condition: itemData.condition || 'good',
                location_address: itemData.location_address || '',
                is_negotiable: itemData.is_negotiable || false,
                images: itemData.images || []
            });
            
            // Set existing image previews
            setImagePreviews(itemData.images || []);
            
        } catch (error) {
            console.error('Error fetching item:', error);
            if (error.response?.status === 404) {
                showToast('Item not found', 'error');
                navigate('/marketplace');
            } else {
                showToast('Error loading item details', 'error');
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
        const currentImageCount = imagePreviews.length + imageFiles.length;
        
        if (files.length + currentImageCount > 6) {
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

    const removeExistingImage = (index, imageUrl) => {
        // Add to removed images list
        setRemovedImages(prev => [...prev, imageUrl]);
        
        // Remove from previews
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
        
        // Remove from form data
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
    };

    const removeNewImage = (index) => {
        const newImageIndex = index - formData.images.length;
        setImageFiles(prev => prev.filter((_, i) => i !== newImageIndex));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    const uploadNewImages = async () => {
        if (imageFiles.length === 0) return [];

        setUploading(true);
        const uploadedUrls = [];

        try {
            for (const file of imageFiles) {
                const formDataUpload = new FormData();
                formDataUpload.append('image', file);
                
                const response = await axios.post('/upload/item-image', formDataUpload, {
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
        if (!formData.category_id) newErrors.category_id = 'Category is required';
        if (!formData.location_address.trim()) newErrors.location_address = 'Location is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            showToast('Please fix the errors before submitting', 'error');
            return;
        }

        setSaving(true);

        try {
            // Upload new images
            const newImageUrls = await uploadNewImages();
            
            // Combine existing images (not removed) with new images
            const allImages = [
                ...formData.images.filter(img => !removedImages.includes(img)),
                ...newImageUrls
            ];
            
            const updateData = {
                ...formData,
                images: allImages,
                price: parseFloat(formData.price)
            };

            await axios.put(`/items/${id}`, updateData);
            
            showToast('Item updated successfully!', 'success');
            
            setTimeout(() => {
                navigate(`/marketplace/item/${id}`);
            }, 1500);
            
        } catch (error) {
            console.error('Error updating item:', error);
            showToast(
                error.response?.data?.message || 'Failed to update item. Please try again.',
                'error'
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteItem = async () => {
        try {
            await axios.delete(`/items/${id}`);
            showToast('Item deleted successfully', 'success');
            
            setTimeout(() => {
                navigate('/profile/listings');
            }, 1500);
        } catch (error) {
            showToast('Error deleting item', 'error');
        }
        setShowDeleteModal(false);
    };

    const showToast = (message, type = 'info') => {
        setToast({ show: true, message, type });
    };

    const closeToast = () => {
        setToast({ show: false, message: '', type: 'info' });
    };

    if (loading) {
        return <LoadingSpinner message="Loading item details..." overlay />;
    }

    if (!item) {
        return (
            <div className="edit-listing-not-found">
                <h2>Item Not Found</h2>
                <p>The item you're trying to edit doesn't exist or you don't have permission to edit it.</p>
                <button 
                    className="btn primary"
                    onClick={() => navigate('/marketplace')}
                >
                    Back to Marketplace
                </button>
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>Edit {item.title} - Campus Cart</title>
                <meta name="description" content={`Edit your listing for ${item.title} on Campus Cart marketplace.`} />
            </Helmet>

            <div className="edit-listing-page">
                <div className="edit-listing-container">
                    <div className="page-header">
                        <h1>Edit Your Listing</h1>
                        <p>Update the details of your item</p>
                    </div>

                    <form onSubmit={handleSubmit} className="edit-listing-form">
                        {/* Basic Information */}
                        <div className="form-section">
                            <h2>Item Details</h2>
                            
                            <div className="form-group">
                                <label htmlFor="title">Title *</label>
                                <input
                                    type="text"
                                    id="title"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleInputChange}
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
                                    rows="5"
                                    className={errors.description ? 'error' : ''}
                                    maxLength={1000}
                                />
                                {errors.description && <span className="error-text">{errors.description}</span>}
                                <small className="help-text">{formData.description.length}/1000 characters</small>
                            </div>

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
                                            min="0"
                                            step="0.01"
                                            className={errors.price ? 'error' : ''}
                                        />
                                    </div>
                                    {errors.price && <span className="error-text">{errors.price}</span>}
                                </div>

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
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="condition">Condition</label>
                                    <select
                                        id="condition"
                                        name="condition"
                                        value={formData.condition}
                                        onChange={handleInputChange}
                                    >
                                        <option value="new">New</option>
                                        <option value="like_new">Like New</option>
                                        <option value="good">Good</option>
                                        <option value="fair">Fair</option>
                                        <option value="poor">Poor</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="location_address">Location *</label>
                                    <input
                                        type="text"
                                        id="location_address"
                                        name="location_address"
                                        value={formData.location_address}
                                        onChange={handleInputChange}
                                        placeholder="Where can buyers find this item?"
                                        className={errors.location_address ? 'error' : ''}
                                    />
                                    {errors.location_address && <span className="error-text">{errors.location_address}</span>}
                                </div>
                            </div>

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

                        {/* Images Section */}
                        <div className="form-section">
                            <h2>Photos</h2>
                            <p className="section-description">
                                Update your photos to help buyers see your item better
                            </p>
                            
                            <div className="image-upload-section">
                                <div className="image-previews">
                                    {imagePreviews.map((preview, index) => (
                                        <div key={index} className="image-preview">
                                            <img src={preview} alt={`Preview ${index + 1}`} />
                                            <button
                                                type="button"
                                                className="remove-image-btn"
                                                onClick={() => {
                                                    if (index < formData.images.length) {
                                                        removeExistingImage(index, formData.images[index]);
                                                    } else {
                                                        removeNewImage(index);
                                                    }
                                                }}
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

                        {/* Form Actions */}
                        <div className="form-actions">
                            <div className="action-group">
                                <button
                                    type="button"
                                    className="btn secondary"
                                    onClick={() => navigate(`/marketplace/item/${id}`)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn primary large"
                                    disabled={saving || uploading}
                                >
                                    {saving ? (
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
                                    🗑️ Delete This Item
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Delete Confirmation Modal */}
                <Modal
                    isOpen={showDeleteModal}
                    onClose={() => setShowDeleteModal(false)}
                    title="Delete Item"
                    size="medium"
                >
                    <div className="delete-modal-content">
                        <div className="warning-icon">⚠️</div>
                        <h3>Are you sure?</h3>
                        <p>
                            This will permanently delete "{item.title}" and all associated data. 
                            This action cannot be undone.
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
                                onClick={handleDeleteItem}
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
        </>
    );
}

export default EditListingPage;
