import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Helmet } from 'react-helmet-async';
import Toast from '../../components/common/Toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import api from '../../utils/api';
import './contact.css';

function ContactSupportPage() {
    const { user } = useAuth();
    
    const [formData, setFormData] = useState({
        name: user ? `${user.first_name} ${user.last_name}` : '',
        email: user ? user.email : '',
        subject: '',
        category: '',
        priority: 'medium',
        message: '',
        attachments: []
    });
    
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
    const [errors, setErrors] = useState({});

    const categories = [
        { value: 'account', label: 'Account Issues', icon: '👤' },
        { value: 'marketplace', label: 'Marketplace Problems', icon: '🛒' },
        { value: 'roommate', label: 'Roommate Matching', icon: '🏠' },
        { value: 'payment', label: 'Payment Issues', icon: '💳' },
        { value: 'safety', label: 'Safety Concerns', icon: '🛡️' },
        { value: 'technical', label: 'Technical Issues', icon: '🔧' },
        { value: 'other', label: 'Other', icon: '📝' }
    ];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        const maxSize = 5 * 1024 * 1024; // 5MB
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf', 'text/plain'];
        
        const validFiles = files.filter(file => {
            if (file.size > maxSize) {
                showToast(`${file.name} is too large (max 5MB)`, 'error');
                return false;
            }
            if (!validTypes.includes(file.type)) {
                showToast(`${file.name} is not a supported file type`, 'error');
                return false;
            }
            return true;
        });
        
        if (formData.attachments.length + validFiles.length > 3) {
            showToast('Maximum 3 files allowed', 'error');
            return;
        }
        
        setFormData(prev => ({
            ...prev,
            attachments: [...prev.attachments, ...validFiles]
        }));
    };

    const removeAttachment = (index) => {
        setFormData(prev => ({
            ...prev,
            attachments: prev.attachments.filter((_, i) => i !== index)
        }));
    };

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.name.trim()) newErrors.name = 'Name is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        if (!formData.subject.trim()) newErrors.subject = 'Subject is required';
        if (!formData.category) newErrors.category = 'Please select a category';
        if (!formData.message.trim()) newErrors.message = 'Message is required';
        if (formData.message.length < 10) newErrors.message = 'Message must be at least 10 characters';
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (formData.email && !emailRegex.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            showToast('Please fix the errors before submitting', 'error');
            return;
        }
        
        setSubmitting(true);
        
        try {
            const submitData = new FormData();
            Object.keys(formData).forEach(key => {
                if (key === 'attachments') {
                    formData.attachments.forEach(file => {
                        submitData.append('attachments', file);
                    });
                } else {
                    submitData.append(key, formData[key]);
                }
            });
            
            await api.post('/support/tickets', submitData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            setSubmitted(true);
            showToast('Support ticket submitted successfully!', 'success');
            
        } catch (error) {
            console.error('Error submitting support ticket:', error);
            showToast('Failed to submit ticket. Please try again.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const showToast = (message, type = 'info') => {
        setToast({ show: true, message, type });
    };

    const closeToast = () => {
        setToast({ show: false, message: '', type: 'info' });
    };

    if (submitted) {
        return (
            <div className="contact-success-page">
                <div className="success-container">
                    <div className="success-animation">
                        <div className="success-checkmark">✅</div>
                    </div>
                    <h2>Ticket Submitted Successfully!</h2>
                    <p>We've received your support request and will get back to you within 24 hours.</p>
                    <div className="success-actions">
                        <button 
                            className="btn secondary"
                            onClick={() => setSubmitted(false)}
                        >
                            Submit Another Ticket
                        </button>
                        <button 
                            className="btn primary"
                            onClick={() => window.location.href = '/help'}
                        >
                            Back to Help Center
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>Contact Support - Campus Cart Help</title>
                <meta name="description" content="Get help from Campus Cart support team. Submit a support ticket for account issues, technical problems, or general questions." />
            </Helmet>

            <div className="contact-support-page">
                <div className="contact-container">
                    <div className="contact-header">
                        <h1>📧 Contact Support</h1>
                        <p>Having trouble? We're here to help! Fill out the form below and we'll get back to you as soon as possible.</p>
                    </div>

                    <div className="contact-content">
                        <div className="contact-form-section">
                            <form onSubmit={handleSubmit} className="contact-form">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="name">Full Name *</label>
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            className={errors.name ? 'error' : ''}
                                            disabled={submitting}
                                        />
                                        {errors.name && <span className="error-text">{errors.name}</span>}
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="email">Email Address *</label>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            className={errors.email ? 'error' : ''}
                                            disabled={submitting}
                                        />
                                        {errors.email && <span className="error-text">{errors.email}</span>}
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="subject">Subject *</label>
                                    <input
                                        type="text"
                                        id="subject"
                                        name="subject"
                                        value={formData.subject}
                                        onChange={handleInputChange}
                                        placeholder="Brief description of your issue"
                                        className={errors.subject ? 'error' : ''}
                                        maxLength={100}
                                        disabled={submitting}
                                    />
                                    {errors.subject && <span className="error-text">{errors.subject}</span>}
                                    <small className="help-text">{formData.subject.length}/100 characters</small>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="category">Category *</label>
                                        <select
                                            id="category"
                                            name="category"
                                            value={formData.category}
                                            onChange={handleInputChange}
                                            className={errors.category ? 'error' : ''}
                                            disabled={submitting}
                                        >
                                            <option value="">Select a category</option>
                                            {categories.map(cat => (
                                                <option key={cat.value} value={cat.value}>
                                                    {cat.icon} {cat.label}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.category && <span className="error-text">{errors.category}</span>}
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="priority">Priority</label>
                                        <select
                                            id="priority"
                                            name="priority"
                                            value={formData.priority}
                                            onChange={handleInputChange}
                                            disabled={submitting}
                                        >
                                            <option value="low">🟢 Low - General question</option>
                                            <option value="medium">🟡 Medium - Issue affecting use</option>
                                            <option value="high">🔴 High - Urgent issue</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="message">Message *</label>
                                    <textarea
                                        id="message"
                                        name="message"
                                        value={formData.message}
                                        onChange={handleInputChange}
                                        placeholder="Please describe your issue in detail. Include any error messages, steps you took, and what you expected to happen."
                                        rows="6"
                                        className={errors.message ? 'error' : ''}
                                        maxLength={2000}
                                        disabled={submitting}
                                    />
                                    {errors.message && <span className="error-text">{errors.message}</span>}
                                    <small className="help-text">{formData.message.length}/2000 characters</small>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="attachments">Attachments (Optional)</label>
                                    <div className="file-upload-area">
                                        <input
                                            type="file"
                                            id="attachments"
                                            multiple
                                            accept=".jpg,.jpeg,.png,.pdf,.txt"
                                            onChange={handleFileUpload}
                                            disabled={submitting}
                                            style={{ display: 'none' }}
                                        />
                                        <label htmlFor="attachments" className="file-upload-btn">
                                            📎 Choose Files
                                        </label>
                                        <small className="help-text">
                                            Upload screenshots or files (JPG, PNG, PDF, TXT - Max 5MB each, 3 files total)
                                        </small>
                                    </div>
                                    
                                    {formData.attachments.length > 0 && (
                                        <div className="attachments-list">
                                            {formData.attachments.map((file, index) => (
                                                <div key={index} className="attachment-item">
                                                    <span className="attachment-name">{file.name}</span>
                                                    <span className="attachment-size">
                                                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                                    </span>
                                                    <button
                                                        type="button"
                                                        className="remove-attachment"
                                                        onClick={() => removeAttachment(index)}
                                                        disabled={submitting}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="form-actions">
                                    <button 
                                        type="submit" 
                                        className="btn primary large"
                                        disabled={submitting}
                                    >
                                        {submitting ? (
                                            <>
                                                <LoadingSpinner size="small" />
                                                Submitting...
                                            </>
                                        ) : (
                                            '📤 Submit Ticket'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div className="contact-sidebar">
                            <div className="support-info-card">
                                <h3>💬 Other Ways to Get Help</h3>
                                <div className="support-options">
                                    <div className="support-option">
                                        <div className="option-icon">📚</div>
                                        <div className="option-content">
                                            <h4>Help Articles</h4>
                                            <p>Browse our comprehensive help center</p>
                                            <a href="/help" className="option-link">Browse Articles →</a>
                                        </div>
                                    </div>
                                    
                                    <div className="support-option">
                                        <div className="option-icon">❓</div>
                                        <div className="option-content">
                                            <h4>FAQ</h4>
                                            <p>Quick answers to common questions</p>
                                            <a href="/help/faq" className="option-link">View FAQ →</a>
                                        </div>
                                    </div>
                                    
                                    <div className="support-option">
                                        <div className="option-icon">👥</div>
                                        <div className="option-content">
                                            <h4>Community</h4>
                                            <p>Get help from other users</p>
                                            <a href="/help/community" className="option-link">Join Community →</a>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="response-time-card">
                                <h3>⏰ Response Times</h3>
                                <div className="response-times">
                                    <div className="response-item">
                                        <span className="priority-dot low"></span>
                                        <span className="priority-label">Low Priority</span>
                                        <span className="response-time">2-3 days</span>
                                    </div>
                                    <div className="response-item">
                                        <span className="priority-dot medium"></span>
                                        <span className="priority-label">Medium Priority</span>
                                        <span className="response-time">1-2 days</span>
                                    </div>
                                    <div className="response-item">
                                        <span className="priority-dot high"></span>
                                        <span className="priority-label">High Priority</span>
                                        <span className="response-time">4-8 hours</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
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
        </>
    );
}

export default ContactSupportPage;
