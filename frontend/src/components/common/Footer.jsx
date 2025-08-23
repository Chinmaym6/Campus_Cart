import React from "react";
import { Link } from "react-router-dom";
import "./Footer.css";

function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-content">
                    <div className="footer-section">
                        <div className="footer-logo">
                            <span className="footer-logo-icon">🛒</span>
                            <span className="footer-logo-text">Campus Cart</span>
                        </div>
                        <p className="footer-description">
                            Your trusted campus marketplace for buying, selling, and finding roommates.
                        </p>
                        <div className="footer-social">
                            <a href="#" className="social-link" aria-label="Facebook">📘</a>
                            <a href="#" className="social-link" aria-label="Instagram">📷</a>
                            <a href="#" className="social-link" aria-label="Twitter">🐦</a>
                            <a href="#" className="social-link" aria-label="Discord">💬</a>
                        </div>
                    </div>

                    <div className="footer-section">
                        <h3 className="footer-title">Quick Links</h3>
                        <ul className="footer-links">
                            <li><Link to="/marketplace" className="footer-link">Marketplace</Link></li>
                            <li><Link to="/roommates" className="footer-link">Find Roommates</Link></li>
                            <li><Link to="/categories" className="footer-link">Categories</Link></li>
                            <li><Link to="/how-it-works" className="footer-link">How It Works</Link></li>
                        </ul>
                    </div>

                    <div className="footer-section">
                        <h3 className="footer-title">Support</h3>
                        <ul className="footer-links">
                            <li><Link to="/help" className="footer-link">Help Center</Link></li>
                            <li><Link to="/safety" className="footer-link">Safety Tips</Link></li>
                            <li><Link to="/contact" className="footer-link">Contact Us</Link></li>
                            <li><Link to="/feedback" className="footer-link">Feedback</Link></li>
                        </ul>
                    </div>

                    <div className="footer-section">
                        <h3 className="footer-title">Legal</h3>
                        <ul className="footer-links">
                            <li><Link to="/privacy" className="footer-link">Privacy Policy</Link></li>
                            <li><Link to="/terms" className="footer-link">Terms of Service</Link></li>
                            <li><Link to="/community-guidelines" className="footer-link">Community Guidelines</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="footer-bottom">
                    <div className="footer-copyright">
                        <p>&copy; {currentYear} Campus Cart. All rights reserved.</p>
                    </div>
                    <div className="footer-bottom-links">
                        <Link to="/privacy" className="footer-bottom-link">Privacy</Link>
                        <Link to="/terms" className="footer-bottom-link">Terms</Link>
                        <Link to="/cookies" className="footer-bottom-link">Cookies</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
