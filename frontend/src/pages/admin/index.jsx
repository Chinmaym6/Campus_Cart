import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { 
    FiUsers, FiShoppingBag, FiFlag, FiTrendingUp, 
    FiDollarSign, FiActivity, FiMail, FiSettings,
    FiBarChart2, FiUserCheck, FiAlertTriangle
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const { user, hasRole } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeUsers: 0,
        totalItems: 0,
        activeListings: 0,
        totalTransactions: 0,
        totalRevenue: 0,
        pendingReports: 0,
        recentActivity: []
    });
    const [loading, setLoading] = useState(true);
    const [recentActivity, setRecentActivity] = useState([]);

    // Check admin access
    useEffect(() => {
        if (!hasRole('admin')) {
            toast.error('Access denied. Admin privileges required.');
            navigate('/unauthorized');
            return;
        }
    }, [hasRole, navigate]);

    // Fetch dashboard stats
    useEffect(() => {
        const fetchDashboardStats = async () => {
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
                    throw new Error('Failed to fetch dashboard stats');
                }

                const data = await response.json();
                setStats(data.stats);
                setRecentActivity(data.recentActivity || []);

            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
                toast.error('Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardStats();
    }, []);

    // Quick action handlers
    const handleQuickAction = (action) => {
        switch (action) {
            case 'users':
                navigate('/admin/users');
                break;
            case 'items':
                navigate('/admin/items');
                break;
            case 'reports':
                navigate('/admin/reports');
                break;
            case 'analytics':
                navigate('/admin/analytics');
                break;
            default:
                break;
        }
    };

    if (loading) {
        return (
            <div className="admin-dashboard loading">
                <div className="dashboard-header">
                    <div className="header-skeleton">
                        <div className="title-skeleton"></div>
                        <div className="subtitle-skeleton"></div>
                    </div>
                </div>
                <div className="stats-grid">
                    {[...Array(6)].map((_, index) => (
                        <div key={index} className="stat-card skeleton">
                            <div className="stat-icon-skeleton"></div>
                            <div className="stat-content-skeleton">
                                <div className="stat-value-skeleton"></div>
                                <div className="stat-label-skeleton"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="admin-dashboard">
            {/* Dashboard Header */}
            <div className="dashboard-header">
                <div className="header-content">
                    <h1>Admin Dashboard</h1>
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
                        <div className="stat-detail">
                            This month
                        </div>
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
                        <div className="stat-detail">
                            All time
                        </div>
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
                        <div className="stat-value">{stats.verifiedUsers?.toLocaleString() || '0'}</div>
                        <div className="stat-label">Verified Users</div>
                        <div className="stat-detail">
                            {((stats.verifiedUsers / stats.totalUsers) * 100).toFixed(1)}% of total
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

export default AdminDashboard;
