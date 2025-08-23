import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Toast from '../../components/common/Toast';
import Modal from '../../components/common/Modal';
import axios from 'axios';
import './Settings.css';

function SettingsPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    
    const [settings, setSettings] = useState({
        notifications: {
            email_messages: true,
            email_listings: true,
            email_purchases: true,
            push_messages: true,
            push_listings: false,
            marketing_emails: false
        },
        privacy: {
            profile_visibility: 'public',
            show_email: false,
            show_phone: false,
            show_last_seen: true
        },
        account: {
            two_factor_enabled: false,
            session_timeout: 30
        }
    });
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [passwordErrors, setPasswordErrors] = useState({});
    const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

    useEffect(() => {
        if (user) {
            fetchSettings();
        } else {
            navigate('/login');
        }
    }, [user, navigate]);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/users/settings');
            setSettings(response.data.settings || settings);
        } catch (error) {
            console.error('Error fetching settings:', error);
            showToast('Error loading settings', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSettingChange = (category, setting, value) => {
        setSettings(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [setting]: value
            }
        }));
    };

    const saveSettings = async () => {
        try {
            setSaving(true);
            await axios.put('/users/settings', { settings });
            showToast('Settings saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving settings:', error);
            showToast('Error saving settings', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = (field, value) => {
        setPasswordData(prev => ({
            ...prev,
            [field]: value
        }));
        
        // Clear error when user starts typing
        if (passwordErrors[field]) {
            setPasswordErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const validatePasswordForm = () => {
        const errors = {};
        
        if (!passwordData.current_password) {
            errors.current_password = 'Current password is required';
        }
        
        if (!passwordData.new_password) {
            errors.new_password = 'New password is required';
        } else if (passwordData.new_password.length < 6) {
            errors.new_password = 'Password must be at least 6 characters';
        }
        
        if (!passwordData.confirm_password) {
            errors.confirm_password = 'Please confirm your new password';
        } else if (passwordData.new_password !== passwordData.confirm_password) {
            errors.confirm_password = 'Passwords do not match';
        }
        
        setPasswordErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleChangePassword = async () => {
        if (!validatePasswordForm()) return;
        
        try {
            await axios.put('/users/password', {
                current_password: passwordData.current_password,
                new_password: passwordData.new_password
            });
            
            setShowPasswordModal(false);
            setPasswordData({
                current_password: '',
                new_password: '',
                confirm_password: ''
            });
            
            showToast('Password changed successfully!', 'success');
        } catch (error) {
            if (error.response?.status === 400) {
                showToast('Current password is incorrect', 'error');
            } else {
                showToast('Error changing password', 'error');
            }
        }
    };

    const handleDeleteAccount = async () => {
        try {
            await axios.delete('/users/account');
            showToast('Account deleted successfully', 'success');
            
            setTimeout(() => {
                logout();
                navigate('/');
            }, 2000);
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

    if (loading) {
        return <LoadingSpinner message="Loading settings..." overlay />;
    }

    return (
        <>
            <Helmet>
                <title>Settings - Campus Cart</title>
                <meta name="description" content="Manage your Campus Cart account settings, notifications, and privacy preferences." />
            </Helmet>

            <div className="settings-page">
                <div className="settings-container">
                    <div className="page-header">
                        <h1>Account Settings</h1>
                        <p>Manage your preferences and account security</p>
                    </div>

                    <div className="settings-content">
                        {/* Notifications Settings */}
                        <div className="settings-section">
                            <div className="section-header">
                                <h2>🔔 Notifications</h2>
                                <p>Choose how you want to be notified</p>
                            </div>
                            
                            <div className="settings-group">
                                <h3>Email Notifications</h3>
                                
                                <div className="setting-item">
                                    <div className="setting-info">
                                        <label>New Messages</label>
                                        <span>Get notified when you receive new messages</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.notifications.email_messages}
                                        onChange={(e) => handleSettingChange('notifications', 'email_messages', e.target.checked)}
                                    />
                                </div>
                                
                                <div className="setting-item">
                                    <div className="setting-info">
                                        <label>Listing Updates</label>
                                        <span>Updates about your listings and interest from buyers</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.notifications.email_listings}
                                        onChange={(e) => handleSettingChange('notifications', 'email_listings', e.target.checked)}
                                    />
                                </div>
                                
                                <div className="setting-item">
                                    <div className="setting-info">
                                        <label>Purchase Confirmations</label>
                                        <span>Confirmations and updates about your purchases</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.notifications.email_purchases}
                                        onChange={(e) => handleSettingChange('notifications', 'email_purchases', e.target.checked)}
                                    />
                                </div>
                                
                                <div className="setting-item">
                                    <div className="setting-info">
                                        <label>Marketing Emails</label>
                                        <span>Tips, featured items, and Campus Cart updates</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.notifications.marketing_emails}
                                        onChange={(e) => handleSettingChange('notifications', 'marketing_emails', e.target.checked)}
                                    />
                                </div>
                            </div>
                            
                            <div className="settings-group">
                                <h3>Push Notifications</h3>
                                
                                <div className="setting-item">
                                    <div className="setting-info">
                                        <label>New Messages</label>
                                        <span>Instant notifications for new messages</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.notifications.push_messages}
                                        onChange={(e) => handleSettingChange('notifications', 'push_messages', e.target.checked)}
                                    />
                                </div>
                                
                                <div className="setting-item">
                                    <div className="setting-info">
                                        <label>Listing Activity</label>
                                        <span>When someone views or saves your items</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.notifications.push_listings}
                                        onChange={(e) => handleSettingChange('notifications', 'push_listings', e.target.checked)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Privacy Settings */}
                        <div className="settings-section">
                            <div className="section-header">
                                <h2>🔒 Privacy</h2>
                                <p>Control who can see your information</p>
                            </div>
                            
                            <div className="settings-group">
                                <div className="setting-item">
                                    <div className="setting-info">
                                        <label>Profile Visibility</label>
                                        <span>Who can see your profile information</span>
                                    </div>
                                    <select
                                        value={settings.privacy.profile_visibility}
                                        onChange={(e) => handleSettingChange('privacy', 'profile_visibility', e.target.value)}
                                        className="setting-select"
                                    >
                                        <option value="public">Everyone</option>
                                        <option value="students">Students only</option>
                                        <option value="private">Private</option>
                                    </select>
                                </div>
                                
                                <div className="setting-item">
                                    <div className="setting-info">
                                        <label>Show Email Address</label>
                                        <span>Allow others to see your email address</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.privacy.show_email}
                                        onChange={(e) => handleSettingChange('privacy', 'show_email', e.target.checked)}
                                    />
                                </div>
                                
                                <div className="setting-item">
                                    <div className="setting-info">
                                        <label>Show Phone Number</label>
                                        <span>Allow others to see your phone number</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.privacy.show_phone}
                                        onChange={(e) => handleSettingChange('privacy', 'show_phone', e.target.checked)}
                                    />
                                </div>
                                
                                <div className="setting-item">
                                    <div className="setting-info">
                                        <label>Show Last Seen</label>
                                        <span>Display when you were last active</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.privacy.show_last_seen}
                                        onChange={(e) => handleSettingChange('privacy', 'show_last_seen', e.target.checked)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Security Settings */}
                        <div className="settings-section">
                            <div className="section-header">
                                <h2>🛡️ Security</h2>
                                <p>Keep your account secure</p>
                            </div>
                            
                            <div className="settings-group">
                                <div className="setting-item">
                                    <div className="setting-info">
                                        <label>Password</label>
                                        <span>Last changed: Never</span>
                                    </div>
                                    <button 
                                        className="btn secondary"
                                        onClick={() => setShowPasswordModal(true)}
                                    >
                                        Change Password
                                    </button>
                                </div>
                                
                                <div className="setting-item">
                                    <div className="setting-info">
                                        <label>Two-Factor Authentication</label>
                                        <span>Add an extra layer of security to your account</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.account.two_factor_enabled}
                                        onChange={(e) => handleSettingChange('account', 'two_factor_enabled', e.target.checked)}
                                    />
                                </div>
                                
                                <div className="setting-item">
                                    <div className="setting-info">
                                        <label>Session Timeout</label>
                                        <span>Automatically log out after inactivity</span>
                                    </div>
                                    <select
                                        value={settings.account.session_timeout}
                                        onChange={(e) => handleSettingChange('account', 'session_timeout', parseInt(e.target.value))}
                                        className="setting-select"
                                    >
                                        <option value={15}>15 minutes</option>
                                        <option value={30}>30 minutes</option>
                                        <option value={60}>1 hour</option>
                                        <option value={120}>2 hours</option>
                                        <option value={0}>Never</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Danger Zone */}
                        <div className="settings-section danger-zone">
                            <div className="section-header">
                                <h2>⚠️ Danger Zone</h2>
                                <p>Irreversible actions</p>
                            </div>
                            
                            <div className="settings-group">
                                <div className="setting-item">
                                    <div className="setting-info">
                                        <label>Delete Account</label>
                                        <span>Permanently delete your account and all data</span>
                                    </div>
                                    <button 
                                        className="btn danger"
                                        onClick={() => setShowDeleteModal(true)}
                                    >
                                        Delete Account
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="settings-actions">
                            <button 
                                className="btn primary large"
                                onClick={saveSettings}
                                disabled={saving}
                            >
                                {saving ? (
                                    <>
                                        <LoadingSpinner size="small" />
                                        Saving...
                                    </>
                                ) : (
                                    '💾 Save Settings'
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Change Password Modal */}
                <Modal
                    isOpen={showPasswordModal}
                    onClose={() => setShowPasswordModal(false)}
                    title="Change Password"
                    size="medium"
                >
                    <div className="password-modal-content">
                        <div className="form-group">
                            <label htmlFor="current_password">Current Password</label>
                            <input
                                type="password"
                                id="current_password"
                                value={passwordData.current_password}
                                onChange={(e) => handlePasswordChange('current_password', e.target.value)}
                                className={passwordErrors.current_password ? 'error' : ''}
                            />
                            {passwordErrors.current_password && (
                                <span className="error-text">{passwordErrors.current_password}</span>
                            )}
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="new_password">New Password</label>
                            <input
                                type="password"
                                id="new_password"
                                value={passwordData.new_password}
                                onChange={(e) => handlePasswordChange('new_password', e.target.value)}
                                className={passwordErrors.new_password ? 'error' : ''}
                            />
                            {passwordErrors.new_password && (
                                <span className="error-text">{passwordErrors.new_password}</span>
                            )}
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="confirm_password">Confirm New Password</label>
                            <input
                                type="password"
                                id="confirm_password"
                                value={passwordData.confirm_password}
                                onChange={(e) => handlePasswordChange('confirm_password', e.target.value)}
                                className={passwordErrors.confirm_password ? 'error' : ''}
                            />
                            {passwordErrors.confirm_password && (
                                <span className="error-text">{passwordErrors.confirm_password}</span>
                            )}
                        </div>
                        
                        <div className="modal-actions">
                            <button 
                                className="btn secondary"
                                onClick={() => setShowPasswordModal(false)}
                            >
                                Cancel
                            </button>
                            <button 
                                className="btn primary"
                                onClick={handleChangePassword}
                            >
                                Change Password
                            </button>
                        </div>
                    </div>
                </Modal>

                {/* Delete Account Modal */}
                <Modal
                    isOpen={showDeleteModal}
                    onClose={() => setShowDeleteModal(false)}
                    title="Delete Account"
                    size="medium"
                >
                    <div className="delete-modal-content">
                        <div className="warning-icon">⚠️</div>
                        <h3>Are you absolutely sure?</h3>
                        <p>
                            This action cannot be undone. This will permanently delete your 
                            account and remove all your data from our servers.
                        </p>
                        <p>This includes:</p>
                        <ul>
                            <li>Your profile and account information</li>
                            <li>All your listings and messages</li>
                            <li>Your purchase and sales history</li>
                            <li>Saved items and preferences</li>
                        </ul>
                        
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
        </>
    );
}

export default SettingsPage;
