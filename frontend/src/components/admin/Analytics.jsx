import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useDebounce } from '../../hooks/useDebounce';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';
import {
    FiTrendingUp, FiUsers, FiShoppingBag, FiDollarSign,
    FiCalendar, FiDownload, FiRefreshCw, FiFilter
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import './Analytics.css';

const Analytics = () => {
    const { user, hasRole } = useAuth();
    const [analyticsData, setAnalyticsData] = useState({
        userGrowth: [],
        itemStats: {},
        transactionData: [],
        universityBreakdown: [],
        categoryPerformance: [],
        revenueMetrics: {}
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timeRange, setTimeRange] = useState('30d');
    const [refreshing, setRefreshing] = useState(false);

    // Fetch analytics data
    const fetchAnalyticsData = async () => {
        if (!hasRole('admin')) {
            toast.error('Access denied. Admin privileges required.');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const token = localStorage.getItem('accessToken');
            
            const response = await fetch(`/api/admin/analytics?range=${timeRange}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch analytics: ${response.status}`);
            }

            const data = await response.json();
            setAnalyticsData(data);

        } catch (err) {
            console.error('Analytics fetch error:', err);
            setError(err.message);
            toast.error('Failed to load analytics data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Initial load and time range change
    useEffect(() => {
        fetchAnalyticsData();
    }, [timeRange, hasRole]);

    // Refresh handler
    const handleRefresh = () => {
        setRefreshing(true);
        fetchAnalyticsData();
    };

    // Export data handler
    const handleExport = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`/api/admin/analytics/export?range=${timeRange}&format=csv`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Export failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success('Analytics data exported successfully!');
        } catch (err) {
            toast.error('Failed to export data');
        }
    };

    // Calculate summary metrics
    const summaryMetrics = useMemo(() => {
        return {
            totalUsers: analyticsData.userGrowth?.totalUsers || 0,
            userGrowthRate: analyticsData.userGrowth?.growthRate || 0,
            totalItems: analyticsData.itemStats?.totalItems || 0,
            itemGrowthRate: analyticsData.itemStats?.growthRate || 0,
            totalRevenue: analyticsData.revenueMetrics?.totalRevenue || 0,
            revenueGrowthRate: analyticsData.revenueMetrics?.growthRate || 0,
            totalTransactions: analyticsData.transactionData?.length || 0
        };
    }, [analyticsData]);

    // Chart colors
    const COLORS = ['#667eea', '#764ba2', '#48bb78', '#ed8936', '#9f7aea', '#38b2ac'];

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
            <div className="analytics-loading">
                <div className="loading-spinner"></div>
                <p>Loading analytics data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="analytics-error">
                <h3>Failed to Load Analytics</h3>
                <p>{error}</p>
                <button onClick={fetchAnalyticsData} className="retry-btn">
                    <FiRefreshCw />
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="analytics-container">
            {/* Header */}
            <div className="analytics-header">
                <div className="header-left">
                    <h1>Analytics Dashboard</h1>
                    <p>Comprehensive insights into Campus Cart performance</p>
                </div>
                <div className="header-right">
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
                    <button 
                        onClick={handleRefresh} 
                        className="refresh-btn"
                        disabled={refreshing}
                    >
                        <FiRefreshCw className={refreshing ? 'spinning' : ''} />
                        Refresh
                    </button>
                    <button onClick={handleExport} className="export-btn">
                        <FiDownload />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Summary Metrics */}
            <div className="metrics-grid">
                <div className="metric-card users">
                    <div className="metric-icon">
                        <FiUsers />
                    </div>
                    <div className="metric-content">
                        <div className="metric-value">
                            {summaryMetrics.totalUsers.toLocaleString()}
                        </div>
                        <div className="metric-label">Total Users</div>
                        <div className={`metric-change ${summaryMetrics.userGrowthRate >= 0 ? 'positive' : 'negative'}`}>
                            {summaryMetrics.userGrowthRate >= 0 ? '+' : ''}{summaryMetrics.userGrowthRate}% this period
                        </div>
                    </div>
                </div>

                <div className="metric-card items">
                    <div className="metric-icon">
                        <FiShoppingBag />
                    </div>
                    <div className="metric-content">
                        <div className="metric-value">
                            {summaryMetrics.totalItems.toLocaleString()}
                        </div>
                        <div className="metric-label">Total Items</div>
                        <div className={`metric-change ${summaryMetrics.itemGrowthRate >= 0 ? 'positive' : 'negative'}`}>
                            {summaryMetrics.itemGrowthRate >= 0 ? '+' : ''}{summaryMetrics.itemGrowthRate}% this period
                        </div>
                    </div>
                </div>

                <div className="metric-card revenue">
                    <div className="metric-icon">
                        <FiDollarSign />
                    </div>
                    <div className="metric-content">
                        <div className="metric-value">
                            ${summaryMetrics.totalRevenue.toLocaleString()}
                        </div>
                        <div className="metric-label">Total Revenue</div>
                        <div className={`metric-change ${summaryMetrics.revenueGrowthRate >= 0 ? 'positive' : 'negative'}`}>
                            {summaryMetrics.revenueGrowthRate >= 0 ? '+' : ''}{summaryMetrics.revenueGrowthRate}% this period
                        </div>
                    </div>
                </div>

                <div className="metric-card transactions">
                    <div className="metric-icon">
                        <FiTrendingUp />
                    </div>
                    <div className="metric-content">
                        <div className="metric-value">
                            {summaryMetrics.totalTransactions.toLocaleString()}
                        </div>
                        <div className="metric-label">Transactions</div>
                        <div className="metric-change positive">
                            Active marketplace
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="charts-section">
                {/* User Growth Chart */}
                <div className="chart-container">
                    <div className="chart-header">
                        <h3>User Growth Over Time</h3>
                        <span className="chart-period">{timeRange}</span>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={analyticsData.userGrowth || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line 
                                type="monotone" 
                                dataKey="users" 
                                stroke="#667eea" 
                                strokeWidth={2}
                                dot={{ fill: '#667eea' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Revenue Chart */}
                <div className="chart-container">
                    <div className="chart-header">
                        <h3>Revenue Analytics</h3>
                        <span className="chart-period">{timeRange}</span>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analyticsData.revenueMetrics?.dailyRevenue || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="revenue" fill="#48bb78" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Breakdown Tables */}
            <div className="breakdown-section">
                {/* Top Universities */}
                <div className="breakdown-container">
                    <div className="breakdown-header">
                        <h3>Top Universities</h3>
                        <span className="breakdown-count">
                            {analyticsData.universityBreakdown?.length || 0} universities
                        </span>
                    </div>
                    <div className="breakdown-list">
                        {analyticsData.universityBreakdown?.slice(0, 10).map((university, index) => (
                            <div key={index} className="breakdown-item">
                                <span className="rank">#{index + 1}</span>
                                <span className="name">{university.name}</span>
                                <span className="count">{university.userCount} users</span>
                                <span className="percentage">{university.percentage}%</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Category Performance */}
                <div className="breakdown-container">
                    <div className="breakdown-header">
                        <h3>Category Performance</h3>
                        <span className="breakdown-count">
                            {analyticsData.categoryPerformance?.length || 0} categories
                        </span>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={analyticsData.categoryPerformance || []}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {(analyticsData.categoryPerformance || []).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Last Updated */}
            <div className="analytics-footer">
                <p>
                    <FiCalendar />
                    Last updated: {new Date().toLocaleString()}
                </p>
            </div>
        </div>
    );
};

export default Analytics;
