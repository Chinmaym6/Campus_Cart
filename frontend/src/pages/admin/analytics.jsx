import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { 
    FiTrendingUp, FiUsers, FiShoppingBag, FiDollarSign,
    FiCalendar, FiDownload, FiFilter, FiRefreshCw
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import './Analytics.css';

const Analytics = () => {
    const { hasRole } = useAuth();
    const [timeRange, setTimeRange] = useState('30d');
    const [analytics, setAnalytics] = useState({
        userGrowth: [],
        itemStats: {},
        transactionData: [],
        universityBreakdown: [],
        categoryPerformance: [],
        revenueMetrics: {}
    });
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);

    // Fetch analytics data
    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('accessToken');
            
            const response = await fetch(`/api/admin/analytics?range=${timeRange}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch analytics');
            }

            const data = await response.json();
            setAnalytics(data);
            setLastUpdated(new Date());

        } catch (error) {
            console.error('Error fetching analytics:', error);
            toast.error('Failed to load analytics data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (hasRole('admin')) {
            fetchAnalytics();
        }
    }, [timeRange, hasRole]);

    // Export analytics data
    const exportData = async (format = 'csv') => {
        try {
            const token = localStorage.getItem('accessToken');
            
            const response = await fetch(`/api/admin/analytics/export?format=${format}&range=${timeRange}`, {
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
            a.download = `campus-cart-analytics-${timeRange}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success('Analytics data exported successfully!');

        } catch (error) {
            console.error('Export error:', error);
            toast.error('Failed to export data');
        }
    };

    if (!hasRole('admin')) {
        return (
            <div className="admin-error">
                <h2>Access Denied</h2>
                <p>You don't have permission to view this page.</p>
            </div>
        );
    }

    return (
        <div className="analytics-dashboard">
            {/* Header */}
            <div className="analytics-header">
                <div className="header-content">
                    <h1>Analytics Dashboard</h1>
                    <p>Comprehensive insights into Campus Cart performance</p>
                </div>
                <div className="header-controls">
                    <div className="time-range-selector">
                        <select 
                            value={timeRange} 
                            onChange={(e) => setTimeRange(e.target.value)}
                            className="time-range-select"
                        >
                            <option value="7d">Last 7 days</option>
                            <option value="30d">Last 30 days</option>
                            <option value="90d">Last 90 days</option>
                            <option value="1y">Last year</option>
                            <option value="all">All time</option>
                        </select>
                    </div>
                    <button 
                        className="btn btn-secondary"
                        onClick={fetchAnalytics}
                        disabled={loading}
                    >
                        <FiRefreshCw className={loading ? 'spinning' : ''} />
                        Refresh
                    </button>
                    <button 
                        className="btn btn-primary"
                        onClick={() => exportData('csv')}
                    >
                        <FiDownload />
                        Export CSV
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="analytics-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading analytics data...</p>
                </div>
            ) : (
                <>
                    {/* Key Metrics */}
                    <div className="metrics-grid">
                        <div className="metric-card">
                            <div className="metric-icon users">
                                <FiUsers />
                            </div>
                            <div className="metric-content">
                                <div className="metric-value">
                                    {analytics.userGrowth?.totalUsers?.toLocaleString() || '0'}
                                </div>
                                <div className="metric-label">Total Users</div>
                                <div className="metric-change positive">
                                    +{analytics.userGrowth?.growthRate || '0'}% this {timeRange}
                                </div>
                            </div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-icon items">
                                <FiShoppingBag />
                            </div>
                            <div className="metric-content">
                                <div className="metric-value">
                                    {analytics.itemStats?.totalItems?.toLocaleString() || '0'}
                                </div>
                                <div className="metric-label">Total Items</div>
                                <div className="metric-change positive">
                                    +{analytics.itemStats?.growthRate || '0'}% this {timeRange}
                                </div>
                            </div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-icon revenue">
                                <FiDollarSign />
                            </div>
                            <div className="metric-content">
                                <div className="metric-value">
                                    ${analytics.revenueMetrics?.totalRevenue?.toLocaleString() || '0'}
                                </div>
                                <div className="metric-label">Total Revenue</div>
                                <div className="metric-change positive">
                                    +{analytics.revenueMetrics?.growthRate || '0'}% this {timeRange}
                                </div>
                            </div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-icon growth">
                                <FiTrendingUp />
                            </div>
                            <div className="metric-content">
                                <div className="metric-value">
                                    {analytics.transactionData?.length || '0'}
                                </div>
                                <div className="metric-label">Transactions</div>
                                <div className="metric-change positive">
                                    +{analytics.transactionData?.growthRate || '0'}% this {timeRange}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="charts-section">
                        <div className="chart-container">
                            <div className="chart-header">
                                <h3>User Growth Over Time</h3>
                                <div className="chart-period">{timeRange}</div>
                            </div>
                            <div className="chart-content">
                                {/* Chart component would go here */}
                                <div className="chart-placeholder">
                                    <FiTrendingUp className="chart-icon" />
                                    <p>User growth chart visualization</p>
                                    <small>Chart showing user registration trends</small>
                                </div>
                            </div>
                        </div>

                        <div className="chart-container">
                            <div className="chart-header">
                                <h3>Revenue Analytics</h3>
                                <div className="chart-period">{timeRange}</div>
                            </div>
                            <div className="chart-content">
                                <div className="chart-placeholder">
                                    <FiDollarSign className="chart-icon" />
                                    <p>Revenue chart visualization</p>
                                    <small>Revenue trends and projections</small>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Breakdown Tables */}
                    <div className="breakdown-section">
                        <div className="breakdown-container">
                            <div className="breakdown-header">
                                <h3>Top Universities</h3>
                                <span className="breakdown-count">
                                    {analytics.universityBreakdown?.length || 0} universities
                                </span>
                            </div>
                            <div className="breakdown-table">
                                {analytics.universityBreakdown?.slice(0, 10).map((uni, index) => (
                                    <div key={index} className="breakdown-row">
                                        <div className="breakdown-rank">#{index + 1}</div>
                                        <div className="breakdown-name">{uni.name}</div>
                                        <div className="breakdown-count">{uni.userCount} users</div>
                                        <div className="breakdown-percentage">{uni.percentage}%</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="breakdown-container">
                            <div className="breakdown-header">
                                <h3>Top Categories</h3>
                                <span className="breakdown-count">
                                    {analytics.categoryPerformance?.length || 0} categories
                                </span>
                            </div>
                            <div className="breakdown-table">
                                {analytics.categoryPerformance?.slice(0, 10).map((category, index) => (
                                    <div key={index} className="breakdown-row">
                                        <div className="breakdown-rank">#{index + 1}</div>
                                        <div className="breakdown-name">{category.name}</div>
                                        <div className="breakdown-count">{category.itemCount} items</div>
                                        <div className="breakdown-percentage">{category.percentage}%</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Last Updated */}
                    {lastUpdated && (
                        <div className="analytics-footer">
                            <p>
                                <FiCalendar />
                                Last updated: {lastUpdated.toLocaleString()}
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Analytics;
