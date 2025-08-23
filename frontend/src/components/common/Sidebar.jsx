import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./Sidebar.css";

function Sidebar({ isOpen, onClose }) {
    const location = useLocation();
    const [user, setUser] = useState(() => {
        const userData = localStorage.getItem('user');
        return userData ? JSON.parse(userData) : null;
    });

    const isActive = (path) => {
        return location.pathname === path ? 'active' : '';
    };

    const menuItems = [
        { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
        { path: '/marketplace', label: 'Marketplace', icon: '🛍️' },
        { path: '/roommates', label: 'Roommates', icon: '🏠' },
        { path: '/profile', label: 'My Profile', icon: '👤' },
        { path: '/messages', label: 'Messages', icon: '💬' },
        { path: '/favorites', label: 'Saved Items', icon: '❤️' },
        { path: '/sell', label: 'Sell Item', icon: '💰' },
    ];

    const adminItems = [
        { path: '/admin', label: 'Admin Panel', icon: '⚙️' },
        { path: '/admin/users', label: 'Manage Users', icon: '👥' },
        { path: '/admin/reports', label: 'Reports', icon: '📊' },
    ];

    return (
        <>
            <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
            <div className={`sidebar ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-brand">
                        <span className="brand-icon">🛒</span>
                        <span className="brand-text">Campus Cart</span>
                    </div>
                    <button className="sidebar-close" onClick={onClose}>
                        ✕
                    </button>
                </div>

                {user && (
                    <div className="sidebar-user">
                        <div className="user-avatar">
                            {user.profile_picture_url ? (
                                <img src={user.profile_picture_url} alt="Profile" />
                            ) : (
                                <span>{user.first_name?.[0]}{user.last_name?.[0]}</span>
                            )}
                        </div>
                        <div className="user-info">
                            <div className="user-name">{user.first_name} {user.last_name}</div>
                            <div className="user-email">{user.email}</div>
                        </div>
                    </div>
                )}

                <nav className="sidebar-nav">
                    <ul className="nav-list">
                        {menuItems.map((item) => (
                            <li key={item.path}>
                                <Link 
                                    to={item.path} 
                                    className={`nav-item ${isActive(item.path)}`}
                                    onClick={onClose}
                                >
                                    <span className="nav-icon">{item.icon}</span>
                                    <span className="nav-label">{item.label}</span>
                                </Link>
                            </li>
                        ))}
                        
                        {user?.role === 'admin' && (
                            <>
                                <li className="nav-divider">
                                    <hr />
                                    <span>Administration</span>
                                </li>
                                {adminItems.map((item) => (
                                    <li key={item.path}>
                                        <Link 
                                            to={item.path} 
                                            className={`nav-item ${isActive(item.path)}`}
                                            onClick={onClose}
                                        >
                                            <span className="nav-icon">{item.icon}</span>
                                            <span className="nav-label">{item.label}</span>
                                        </Link>
                                    </li>
                                ))}
                            </>
                        )}
                    </ul>
                </nav>

                <div className="sidebar-footer">
                    <div className="footer-links">
                        <Link to="/help" onClick={onClose}>Help & Support</Link>
                        <Link to="/settings" onClick={onClose}>Settings</Link>
                        <Link to="/privacy" onClick={onClose}>Privacy Policy</Link>
                    </div>
                </div>
            </div>
        </>
    );
}

export default Sidebar;
