import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useDebounce } from '../../hooks/useDebounce';
import {
    FiUsers, FiSearch, FiFilter, FiMoreVertical,
    FiEye, FiEdit, FiTrash2, FiMail, FiShield,
    FiCheck, FiX, FiUserCheck, FiUserX, FiDownload
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { formatDistanceToNow } from 'date-fns';
import './UserManagement.css';

const UserManagement = () => {
    const { user, hasRole } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({
        status: 'all',
        role: 'all',
        university: 'all',
        verified: 'all'
    });
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 25,
        total: 0,
        pages: 0
    });

    const debouncedSearch = useDebounce(searchQuery, 300);

    // Check admin access
    useEffect(() => {
        if (!hasRole('admin')) {
            toast.error('Access denied. Admin privileges required.');
            return;
        }
    }, [hasRole]);

    // Fetch users
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('accessToken');
                
                const queryParams = new URLSearchParams({
                    page: pagination.page,
                    limit: pagination.limit,
                    search: debouncedSearch,
                    status: filters.status,
                    role: filters.role,
                    university: filters.university,
                    verified: filters.verified
                });

                const response = await fetch(`/api/admin/users?${queryParams}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch users');
                }

                const data = await response.json();
                setUsers(data.users);
                setPagination(prev => ({
                    ...prev,
                    total: data.pagination.total,
                    pages: data.pagination.pages
                }));

            } catch (err) {
                console.error('Users fetch error:', err);
                toast.error('Failed to load users');
            } finally {
                setLoading(false);
            }
        };

        if (hasRole('admin')) {
            fetchUsers();
        }
    }, [hasRole, pagination.page, debouncedSearch, filters]);

    // Handle user action
    const handleUserAction = async (userId, action, data = {}) => {
        try {
            const token = localStorage.getItem('accessToken');
            
            const response = await fetch(`/api/admin/users/${userId}/${action}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`Failed to ${action} user`);
            }

            // Update local state
            setUsers(prev => prev.map(user => {
                if (user.id === userId) {
                    switch (action) {
                        case 'suspend':
                            return { ...user, status: 'suspended' };
                        case 'activate':
                            return { ...user, status: 'active' };
                        case 'verify':
                            return { ...user, emailVerified: true };
                        case 'unverify':
                            return { ...user, emailVerified: false };
                        default:
                            return user;
                    }
                }
                return user;
            }));

            toast.success(`User ${action}d successfully`);

        } catch (err) {
            console.error(`Error ${action}ing user:`, err);
            toast.error(`Failed to ${action} user`);
        }
    };

    // Handle bulk actions
    const handleBulkAction = async (action) => {
        if (selectedUsers.length === 0) {
            toast.warning('Please select users first');
            return;
        }

        try {
            const token = localStorage.getItem('accessToken');
            
            const response = await fetch(`/api/admin/users/bulk/${action}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userIds: selectedUsers })
            });

            if (!response.ok) {
                throw new Error(`Failed to ${action} users`);
            }

            toast.success(`${selectedUsers.length} users ${action}d successfully`);
            setSelectedUsers([]);
            
            // Refresh users list
            window.location.reload();

        } catch (err) {
            console.error(`Error bulk ${action}ing users:`, err);
            toast.error(`Failed to ${action} users`);
        }
    };

    // Export users
    const exportUsers = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            
            const response = await fetch('/api/admin/users/export', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Export failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `campus-cart-users-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success('Users exported successfully!');

        } catch (err) {
            console.error('Export error:', err);
            toast.error('Failed to export users');
        }
    };

    // Toggle user selection
    const toggleUserSelection = (userId) => {
        setSelectedUsers(prev => 
            prev.includes(userId) 
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    // Select all users
    const toggleSelectAll = () => {
        if (selectedUsers.length === users.length) {
            setSelectedUsers([]);
        } else {
            setSelectedUsers(users.map(user => user.id));
        }
    };

    if (!hasRole('admin')) {
        return (
            <div className="access-denied">
                <h2>Access Denied</h2>
                <p>You don't have permission to view this page.</p>
            </div>
        );
    }

    return (
        <div className="user-management-container">
            {/* Header */}
            <div className="users-header">
                <div className="header-content">
                    <h1>User Management</h1>
                    <p>Manage user accounts, permissions, and status</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={exportUsers}>
                        <FiDownload />
                        Export Users
                    </button>
                </div>
            </div>

            {/* Controls */}
            <div className="users-controls">
                <div className="search-section">
                    <div className="search-input-wrapper">
                        <FiSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search users by name, email, or student ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input"
                        />
                    </div>
                </div>

                <div className="filters-section">
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                        className="filter-select"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="pending_verification">Pending Verification</option>
                    </select>

                    <select
                        value={filters.role}
                        onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                        className="filter-select"
                    >
                        <option value="all">All Roles</option>
                        <option value="user">User</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                    </select>

                    <select
                        value={filters.verified}
                        onChange={(e) => setFilters(prev => ({ ...prev, verified: e.target.value }))}
                        className="filter-select"
                    >
                        <option value="all">All Verification</option>
                        <option value="verified">Verified</option>
                        <option value="unverified">Unverified</option>
                    </select>
                </div>

                {/* Bulk Actions */}
                {selectedUsers.length > 0 && (
                    <div className="bulk-actions">
                        <span>{selectedUsers.length} users selected</span>
                        <button 
                            className="bulk-btn activate"
                            onClick={() => handleBulkAction('activate')}
                        >
                            <FiUserCheck />
                            Activate
                        </button>
                        <button 
                            className="bulk-btn suspend"
                            onClick={() => handleBulkAction('suspend')}
                        >
                            <FiUserX />
                            Suspend
                        </button>
                        <button 
                            className="bulk-btn verify"
                            onClick={() => handleBulkAction('verify')}
                        >
                            <FiShield />
                            Verify
                        </button>
                    </div>
                )}
            </div>

            {/* Users Table */}
            <div className="users-table-container">
                {loading ? (
                    <div className="users-loading">
                        <div className="loading-spinner"></div>
                        <p>Loading users...</p>
                    </div>
                ) : (
                    <div className="users-table">
                        <div className="table-header">
                            <div className="table-cell checkbox">
                                <input
                                    type="checkbox"
                                    checked={selectedUsers.length === users.length && users.length > 0}
                                    onChange={toggleSelectAll}
                                />
                            </div>
                            <div className="table-cell">User</div>
                            <div className="table-cell">University</div>
                            <div className="table-cell">Role</div>
                            <div className="table-cell">Status</div>
                            <div className="table-cell">Joined</div>
                            <div className="table-cell">Actions</div>
                        </div>

                        <div className="table-body">
                            {users.map((userData) => (
                                <div key={userData.id} className="table-row">
                                    <div className="table-cell checkbox">
                                        <input
                                            type="checkbox"
                                            checked={selectedUsers.includes(userData.id)}
                                            onChange={() => toggleUserSelection(userData.id)}
                                        />
                                    </div>
                                    
                                    <div className="table-cell user-info">
                                        <img
                                            src={userData.profilePicture || '/default-avatar.png'}
                                            alt={`${userData.firstName} ${userData.lastName}`}
                                            className="user-avatar"
                                            onError={(e) => {
                                                e.target.src = '/default-avatar.png';
                                            }}
                                        />
                                        <div className="user-details">
                                            <div className="user-name">
                                                {userData.firstName} {userData.lastName}
                                                {userData.emailVerified && <FiCheck className="verified-icon" />}
                                            </div>
                                            <div className="user-email">{userData.email}</div>
                                            {userData.studentId && (
                                                <div className="user-student-id">ID: {userData.studentId}</div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="table-cell">
                                        {userData.universityName || 'Not specified'}
                                    </div>

                                    <div className="table-cell">
                                        <span className={`role-badge ${userData.role}`}>
                                            {userData.role}
                                        </span>
                                    </div>

                                    <div className="table-cell">
                                        <span className={`status-badge ${userData.status}`}>
                                            {userData.status}
                                        </span>
                                    </div>

                                    <div className="table-cell">
                                        {formatDistanceToNow(new Date(userData.createdAt), { addSuffix: true })}
                                    </div>

                                    <div className="table-cell actions">
                                        <div className="action-buttons">
                                            <button
                                                className="action-btn view"
                                                onClick={() => window.open(`/profile/${userData.id}`, '_blank')}
                                                title="View Profile"
                                            >
                                                <FiEye />
                                            </button>
                                            
                                            {userData.status === 'active' ? (
                                                <button
                                                    className="action-btn suspend"
                                                    onClick={() => handleUserAction(userData.id, 'suspend')}
                                                    title="Suspend User"
                                                >
                                                    <FiUserX />
                                                </button>
                                            ) : (
                                                <button
                                                    className="action-btn activate"
                                                    onClick={() => handleUserAction(userData.id, 'activate')}
                                                    title="Activate User"
                                                >
                                                    <FiUserCheck />
                                                </button>
                                            )}
                                            
                                            {!userData.emailVerified && (
                                                <button
                                                    className="action-btn verify"
                                                    onClick={() => handleUserAction(userData.id, 'verify')}
                                                    title="Verify Email"
                                                >
                                                    <FiShield />
                                                </button>
                                            )}
                                            
                                            <button
                                                className="action-btn message"
                                                onClick={() => window.open(`mailto:${userData.email}`, '_blank')}
                                                title="Send Email"
                                            >
                                                <FiMail />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div className="pagination">
                        <button
                            disabled={pagination.page === 1}
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        >
                            Previous
                        </button>
                        
                        <div className="pagination-info">
                            Page {pagination.page} of {pagination.pages} 
                            ({pagination.total} total users)
                        </div>
                        
                        <button
                            disabled={pagination.page === pagination.pages}
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserManagement;
