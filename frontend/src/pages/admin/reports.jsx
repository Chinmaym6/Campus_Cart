import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { 
    FiFlag, FiUser, FiShoppingBag, FiMessageSquare,
    FiEye, FiCheck, FiX, FiAlertTriangle, FiFilter,
    FiSearch, FiMoreVertical, FiChevronDown
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { formatDistanceToNow } from 'date-fns';
import './Reports.css';

const Reports = () => {
    const { hasRole } = useAuth();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState(null);
    const [filters, setFilters] = useState({
        status: 'all',
        type: 'all',
        search: ''
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
    });

    // Fetch reports
    const fetchReports = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('accessToken');
            
            const queryParams = new URLSearchParams({
                page: pagination.page,
                limit: pagination.limit,
                status: filters.status,
                type: filters.type,
                search: filters.search
            });

            const response = await fetch(`/api/admin/reports?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch reports');
            }

            const data = await response.json();
            setReports(data.reports);
            setPagination(prev => ({
                ...prev,
                total: data.pagination.total,
                pages: data.pagination.pages
            }));

        } catch (error) {
            console.error('Error fetching reports:', error);
            toast.error('Failed to load reports');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (hasRole('admin')) {
            fetchReports();
        }
    }, [hasRole, pagination.page, filters]);

    // Handle report action
    const handleReportAction = async (reportId, action, reason = '') => {
        try {
            const token = localStorage.getItem('accessToken');
            
            const response = await fetch(`/api/admin/reports/${reportId}/action`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action, reason })
            });

            if (!response.ok) {
                throw new Error(`Failed to ${action} report`);
            }

            // Update local state
            setReports(prev => prev.map(report => 
                report.id === reportId 
                    ? { ...report, status: action === 'resolve' ? 'resolved' : 'dismissed' }
                    : report
            ));

            toast.success(`Report ${action}d successfully`);
            setSelectedReport(null);

        } catch (error) {
            console.error(`Error ${action}ing report:`, error);
            toast.error(`Failed to ${action} report`);
        }
    };

    // Get report type icon
    const getReportTypeIcon = (type) => {
        switch (type) {
            case 'user':
                return <FiUser />;
            case 'item':
                return <FiShoppingBag />;
            case 'message':
                return <FiMessageSquare />;
            default:
                return <FiFlag />;
        }
    };

    // Get priority color
    const getPriorityColor = (type, createdAt) => {
        const hoursAgo = (new Date() - new Date(createdAt)) / (1000 * 60 * 60);
        
        if (type === 'harassment' || type === 'fraud') return 'high';
        if (hoursAgo > 24) return 'high';
        if (hoursAgo > 12) return 'medium';
        return 'low';
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
        <div className="reports-management">
            {/* Header */}
            <div className="reports-header">
                <div className="header-content">
                    <h1>Reports Management</h1>
                    <p>Review and manage user reports and content violations</p>
                </div>
                <div className="header-stats">
                    <div className="stat-item">
                        <div className="stat-value">
                            {reports.filter(r => r.status === 'pending').length}
                        </div>
                        <div className="stat-label">Pending</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">
                            {reports.filter(r => r.status === 'resolved').length}
                        </div>
                        <div className="stat-label">Resolved</div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="reports-filters">
                <div className="search-filter">
                    <FiSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search reports..."
                        value={filters.search}
                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        className="search-input"
                    />
                </div>
                
                <div className="filter-group">
                    <div className="filter-item">
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                            className="filter-select"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="resolved">Resolved</option>
                            <option value="dismissed">Dismissed</option>
                        </select>
                    </div>
                    
                    <div className="filter-item">
                        <select
                            value={filters.type}
                            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                            className="filter-select"
                        >
                            <option value="all">All Types</option>
                            <option value="inappropriate_content">Inappropriate Content</option>
                            <option value="spam">Spam</option>
                            <option value="harassment">Harassment</option>
                            <option value="fake_listing">Fake Listing</option>
                            <option value="fraud">Fraud</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Reports List */}
            <div className="reports-content">
                {loading ? (
                    <div className="reports-loading">
                        {[...Array(5)].map((_, index) => (
                            <div key={index} className="report-skeleton">
                                <div className="skeleton-avatar"></div>
                                <div className="skeleton-content">
                                    <div className="skeleton-title"></div>
                                    <div className="skeleton-description"></div>
                                    <div className="skeleton-meta"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : reports.length === 0 ? (
                    <div className="empty-reports">
                        <FiFlag className="empty-icon" />
                        <h3>No reports found</h3>
                        <p>There are currently no reports matching your filters.</p>
                    </div>
                ) : (
                    <div className="reports-list">
                        {reports.map((report) => (
                            <div 
                                key={report.id} 
                                className={`report-item ${report.status} ${getPriorityColor(report.type, report.createdAt)}`}
                            >
                                <div className="report-header">
                                    <div className="report-type">
                                        {getReportTypeIcon(report.reportedType)}
                                        <span>{report.type.replace('_', ' ')}</span>
                                    </div>
                                    <div className="report-status">
                                        <span className={`status-badge ${report.status}`}>
                                            {report.status}
                                        </span>
                                        {getPriorityColor(report.type, report.createdAt) === 'high' && (
                                            <FiAlertTriangle className="priority-warning" />
                                        )}
                                    </div>
                                </div>

                                <div className="report-content">
                                    <h4>Report #{report.id}</h4>
                                    <p className="report-description">{report.description}</p>
                                    
                                    <div className="report-details">
                                        <div className="detail-item">
                                            <strong>Reporter:</strong> 
                                            {report.reporter?.firstName} {report.reporter?.lastName}
                                        </div>
                                        {report.reportedUser && (
                                            <div className="detail-item">
                                                <strong>Reported User:</strong>
                                                {report.reportedUser.firstName} {report.reportedUser.lastName}
                                            </div>
                                        )}
                                        {report.reportedItem && (
                                            <div className="detail-item">
                                                <strong>Reported Item:</strong>
                                                {report.reportedItem.title}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="report-meta">
                                    <div className="report-time">
                                        {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                                    </div>
                                    
                                    <div className="report-actions">
                                        <button
                                            className="action-btn view"
                                            onClick={() => setSelectedReport(report)}
                                        >
                                            <FiEye />
                                            View Details
                                        </button>
                                        
                                        {report.status === 'pending' && (
                                            <>
                                                <button
                                                    className="action-btn resolve"
                                                    onClick={() => handleReportAction(report.id, 'resolve')}
                                                >
                                                    <FiCheck />
                                                    Resolve
                                                </button>
                                                <button
                                                    className="action-btn dismiss"
                                                    onClick={() => handleReportAction(report.id, 'dismiss')}
                                                >
                                                    <FiX />
                                                    Dismiss
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div className="reports-pagination">
                        <button
                            disabled={pagination.page === 1}
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        >
                            Previous
                        </button>
                        <span>
                            Page {pagination.page} of {pagination.pages}
                        </span>
                        <button
                            disabled={pagination.page === pagination.pages}
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* Report Detail Modal */}
            {selectedReport && (
                <div className="report-modal-overlay" onClick={() => setSelectedReport(null)}>
                    <div className="report-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Report Details</h3>
                            <button 
                                className="close-modal"
                                onClick={() => setSelectedReport(null)}
                            >
                                <FiX />
                            </button>
                        </div>
                        
                        <div className="modal-content">
                            <div className="report-full-details">
                                <div className="detail-group">
                                    <h4>Report Information</h4>
                                    <p><strong>ID:</strong> #{selectedReport.id}</p>
                                    <p><strong>Type:</strong> {selectedReport.type.replace('_', ' ')}</p>
                                    <p><strong>Status:</strong> {selectedReport.status}</p>
                                    <p><strong>Created:</strong> {new Date(selectedReport.createdAt).toLocaleString()}</p>
                                </div>

                                <div className="detail-group">
                                    <h4>Description</h4>
                                    <p>{selectedReport.description}</p>
                                </div>

                                <div className="detail-group">
                                    <h4>Reporter</h4>
                                    <p>{selectedReport.reporter?.firstName} {selectedReport.reporter?.lastName}</p>
                                    <p>{selectedReport.reporter?.email}</p>
                                </div>

                                {selectedReport.reportedUser && (
                                    <div className="detail-group">
                                        <h4>Reported User</h4>
                                        <p>{selectedReport.reportedUser.firstName} {selectedReport.reportedUser.lastName}</p>
                                        <p>{selectedReport.reportedUser.email}</p>
                                    </div>
                                )}

                                {selectedReport.reportedItem && (
                                    <div className="detail-group">
                                        <h4>Reported Item</h4>
                                        <p><strong>Title:</strong> {selectedReport.reportedItem.title}</p>
                                        <p><strong>Price:</strong> ${selectedReport.reportedItem.price}</p>
                                        {selectedReport.reportedItem.images?.length > 0 && (
                                            <div className="item-images">
                                                {selectedReport.reportedItem.images.slice(0, 3).map((image, index) => (
                                                    <img
                                                        key={index}
                                                        src={image.url}
                                                        alt="Reported item"
                                                        className="reported-item-image"
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="modal-actions">
                            {selectedReport.status === 'pending' && (
                                <>
                                    <button
                                        className="btn btn-success"
                                        onClick={() => handleReportAction(selectedReport.id, 'resolve')}
                                    >
                                        <FiCheck />
                                        Resolve Report
                                    </button>
                                    <button
                                        className="btn btn-danger"
                                        onClick={() => handleReportAction(selectedReport.id, 'dismiss')}
                                    >
                                        <FiX />
                                        Dismiss Report
                                    </button>
                                </>
                            )}
                            <button
                                className="btn btn-secondary"
                                onClick={() => setSelectedReport(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;
