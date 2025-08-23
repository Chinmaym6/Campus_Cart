import React from "react";
import { Link } from "react-router-dom";
import SearchBar from "./SearchBar";
import "./Navbar.css";

function Navbar() {
    const handleSearch = (query) => {
        console.log("Searching for:", query);
        // Add your search logic here
    };

    return (
        <nav className="navbar-container">
            <div className="navbar-logo">
                <Link to="/" className="navbar-logo-link">
                    Campus Cart
                </Link>
            </div>
            <div className="navbar-search">
                <SearchBar onSearch={handleSearch} />
            </div>
            <div className="navbar-links">
                <Link to="/about" className="navbar-link">About</Link>
                <Link to="/contact" className="navbar-link">Contact</Link>
                <Link to="/login" className="navbar-link">Login</Link>
                <Link to="/register" className="navbar-link">Register</Link>
            </div>
        </nav>
    );
}

export default Navbar;