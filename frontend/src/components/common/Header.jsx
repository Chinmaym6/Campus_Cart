import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./Header.css";

function Header() {
    const [user, setUser] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // Check if user is logged in
        const userData = localStorage.getItem('user');
        if (userData) {
            setUser(JSON.parse(userData));
        }
    }, []);

    const handleLogout = async () => {
        try {
            // Call logout API
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
            
            // Clear local storage
            localStorage.removeItem('user');
            setUser(null);
            navigate('/');
        } catch (error) {
            console.error('Logout error:', error);
            // Clear local storage anyway
            localStorage.removeItem('user');
            setUser(null);
            navigate('/');
        }
    };

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const isActive = (path) => {
        return location.pathname === path ? 'active' : '';
    };

    return (
        <header className="header">
            <div className="header-container">
                <div className="header-logo">
                    <Link to="/" className="logo-link">
                        <span className="logo-icon">🛒</span>
                        <span className="logo-text">Campus Cart</span>
                    </Link>
                </div>

                <nav className={`header-nav ${isMenuOpen ? 'nav-open' : ''}`}>
                    <ul className="nav-links">
                        <li>
                            <Link to="/" className={`nav-link ${isActive('/')}`}>
                                Home
                            </Link>
                        </li>
                        <li>
                            <Link to="/marketplace" className={`nav-link ${isActive('/marketplace')}`}>
                                Marketplace
                            </Link>
                        </li>
                        <li>
                            <Link to="/roommates" className={`nav-link ${isActive('/roommates')}`}>
                                Roommates
                            </Link>
                        </li>
                        {user ? (
                            <>
                                <li>
                                    <Link to="/profile" className={`nav-link ${isActive('/profile')}`}>
                                        Profile
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/messages" className={`nav-link ${isActive('/messages')}`}>
                                        Messages
                                    </Link>
                                </li>
                                <li className="user-menu">
                                    <span className="user-greeting">
                                        Hi, {user.first_name}!
                                    </span>
                                    <button className="logout-btn" onClick={handleLogout}>
                                        Logout
                                    </button>
                                </li>
                            </>
                        ) : (
                            <>
                                <li>
                                    <Link to="/login" className={`nav-link login-link ${isActive('/login')}`}>
                                        Login
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/register" className="nav-link register-btn">
                                        Sign Up
                                    </Link>
                                </li>
                            </>
                        )}
                    </ul>
                </nav>

                <button className="mobile-menu-btn" onClick={toggleMenu}>
                    <span className={`hamburger ${isMenuOpen ? 'open' : ''}`}></span>
                    <span className={`hamburger ${isMenuOpen ? 'open' : ''}`}></span>
                    <span className={`hamburger ${isMenuOpen ? 'open' : ''}`}></span>
                </button>
            </div>
        </header>
    );
}

export default Header;
