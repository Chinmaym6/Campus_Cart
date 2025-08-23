import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import {
    FiUsers, FiShoppingBag, FiFlag, FiTrendingUp,
    FiDollarSign, FiActivity, FiSettings, FiBarChart2,
    FiUserCheck, FiAlertTriangle, FiMessageCircle
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import './Dashboard.css';

const Dashboard = () => {
    const { user, hasRole } = useAuth();
    const navigate = useNavigate();
    const [dashboardData, setDashboardData] = useState({
        stats: {
            totalUsers: 0,
            activeUsers: 0,
            totalItems: 0,
            activeListings: 0,
            totalTransactions: 0,
            totalRevenue: 0,
            pendingReports: 0,
            verifiedUsers: 0
        },
        recentActivity: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Check admin access
    useEffect(() => {
        if (!hasRole('admin')) {
            toast.error('Access denied. Admin privileges required.');
            navigate('/unauthorized');
            return;
        }
    }, [hasRole, navigate]);

    // Fetch dashboard data
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('accessToken');
                
                const response = await fetch('/api/admin/dashboard/stats', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch dashboard data');
                }

                const data = await response.json();
                setDashboardData(data);
                setError(null);

            } catch (err) {
                console.error('Dashboard fetch error:', err);
                setError(err.message);
                toast.error('Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };

        if (hasRole('admin')) {
            fetchDashboardData();
        }
    }, [hasRole]);

    // Quick action handlers
    const handleQuickAction = (action) => {
        const routes = {
            users: '/admin/users',
            items: '/admin/items',
            reports: '/admin/reports',
            analytics: '/admin/analytics'
        };

        if (routes[action]) {
            navigate(routes[action]);
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

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="loading-spinner"></div>
                <p>Loading dashboard...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-error">
                <h3>Failed to Load Dashboard</h3>
                <p>{error}</p>
                <button onClick={() => window.location.reload()} className="retry-btn">
                    Retry
                </button>
            </div>
        );
    }

    const { stats, recentActivity } = dashboardData;

    return (
        <div className="dashboard-container">
            {/* Header */}
            <div className="dashboard-header">
                <div className="header-content">
                    <h1>Campus Cart Admin Dashboard</h1>
                    <p>Welcome back, {user?.firstName}! Here's what's happening with Campus Cart.</p>
                </div>
                <div className="header-actions">
                    <button 
                        className="btn btn-primary"
                        onClick={() => navigate('/admin/analytics')}
                    >
                        <FiBarChart2 />
                        View Analytics
                    </button>
                    <button 
                        className="btn btn-secondary"
                        onClick={() => navigate('/admin/settings')}
                    >
                        <FiSettings />
                        Settings
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card users">
                    <div className="stat-icon">
                        <FiUsers />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.totalUsers.toLocaleString()}</div>
                        <div className="stat-label">Total Users</div>
                        <div className="stat-detail">
                            {stats.activeUsers.toLocaleString()} active this month
                        </div>
                    </div>
                    <button 
                        className="stat-action"
                        onClick={() => handleQuickAction('users')}
                    >
                        Manage Users →
                    </button>
                </div>

                <div className="stat-card items">
                    <div className="stat-icon">
                        <FiShoppingBag />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.totalItems.toLocaleString()}</div>
                        <div className="stat-label">Total Items</div>
                        <div className="stat-detail">
                            {stats.activeListings.toLocaleString()} active listings
                        </div>
                    </div>
                    <button 
                        className="stat-action"
                        onClick={() => handleQuickAction('items')}
                    >
                        Manage Items →
                    </button>
                </div>

                <div className="stat-card transactions">
                    <div className="stat-icon">
                        <FiActivity />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.totalTransactions.toLocaleString()}</div>
                        <div className="stat-label">Transactions</div>
                        <div className="stat-detail">This month</div>
                    </div>
                    <button 
                        className="stat-action"
                        onClick={() => handleQuickAction('analytics')}
                    >
                        View Details →
                    </button>
                </div>

                <div className="stat-card revenue">
                    <div className="stat-icon">
                        <FiDollarSign />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">${stats.totalRevenue.toLocaleString()}</div>
                        <div className="stat-label">Platform Revenue</div>
                        <div className="stat-detail">All time</div>
                    </div>
                    <button 
                        className="stat-action"
                        onClick={() => handleQuickAction('analytics')}
                    >
                        View Reports →
                    </button>
                </div>

                <div className="stat-card reports">
                    <div className="stat-icon">
                        <FiFlag />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.pendingReports}</div>
                        <div className="stat-label">Pending Reports</div>
                        <div className="stat-detail">
                            {stats.pendingReports > 0 ? 'Requires attention' : 'All clear'}
                        </div>
                    </div>
                    <button 
                        className="stat-action"
                        onClick={() => handleQuickAction('reports')}
                    >
                        Review Reports →
                    </button>
                </div>

                <div className="stat-card verified-users">
                    <div className="stat-icon">
                        <FiUserCheck />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.verifiedUsers.toLocaleString()}</div>
                        <div className="stat-label">Verified Users</div>
                        <div className="stat-detail">
                            {stats.totalUsers > 0 ? 
                                `${((stats.verifiedUsers / stats.totalUsers) * 100).toFixed(1)}% of total` :
                                '0% of total'
                            }
                        </div>
                    </div>
                    <button 
                        className="stat-action"
                        onClick={() => handleQuickAction('users')}
                    >
                        Manage →
                    </button>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="dashboard-section">
                <h2>Quick Actions</h2>
                <div className="quick-actions">
                    <button 
                        className="quick-action-card"
                        onClick={() => navigate('/admin/users')}
                    >
                        <FiUsers />
                        <span>Manage Users</span>
                    </button>
                    <button 
                        className="quick-action-card"
                        onClick={() => navigate('/admin/items')}
                    >
                        <FiShoppingBag />
                        <span>Review Items</span>
                    </button>
                    <button 
                        className="quick-action-card"
                        onClick={() => navigate('/admin/reports')}
                    >
                        <FiFlag />
                        <span>Handle Reports</span>
                    </button>
                    <button 
                        className="quick-action-card"
                        onClick={() => navigate('/admin/analytics')}
                    >
                        <FiTrendingUp />
                        <span>View Analytics</span>
                    </button>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="dashboard-section">
                <h2>Recent Activity</h2>
                <div className="activity-feed">
                    {recentActivity.length === 0 ? (
                        <div className="empty-activity">
                            <FiActivity className="empty-icon" />
                            <p>No recent activity to show</p>
                        </div>
                    ) : (
                        <div className="activity-list">
                            {recentActivity.slice(0, 10).map((activity, index) => (
                                <div key={index} className="activity-item">
                                    <div className="activity-icon">
                                        {activity.type === 'user' && <FiUsers />}
                                        {activity.type === 'item' && <FiShoppingBag />}
                                        {activity.type === 'report' && <FiFlag />}
                                        {activity.type === 'transaction' && <FiDollarSign />}
                                    </div>
                                    <div className="activity-content">
                                        <div className="activity-title">{activity.title}</div>
                                        <div className="activity-description">{activity.description}</div>
                                        <div className="activity-time">{activity.timeAgo}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* System Status */}
            <div className="dashboard-section">
                <h2>System Status</h2>
                <div className="system-status">
                    <div className="status-item healthy">
                        <div className="status-indicator"></div>
                        <div className="status-content">
                            <div className="status-label">API Server</div>
                            <div className="status-value">Healthy</div>
                        </div>
                    </div>
                    <div className="status-item healthy">
                        <div className="status-indicator"></div>
                        <div className="status-content">
                            <div className="status-label">Database</div>
                            <div className="status-value">Connected</div>
                        </div>
                    </div>
                    <div className="status-item healthy">
                        <div className="status-indicator"></div>
                        <div className="status-content">
                            <div className="status-label">Email Service</div>
                            <div className="status-value">Active</div>
                        </div>
                    </div>
                    {stats.pendingReports > 5 && (
                        <div className="status-item warning">
                            <div className="status-indicator"></div>
                            <div className="status-content">
                                <div className="status-label">Reports Queue</div>
                                <div className="status-value">High Volume</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
