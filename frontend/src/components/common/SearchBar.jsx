import React, { useState, useRef, useEffect } from "react";
import "./SearchBar.css";

function SearchBar({ 
    onSearch, 
    placeholder = "Search for items, categories, or users...",
    showSuggestions = true,
    recentSearches = []
}) {
    const [query, setQuery] = useState("");
    const [isActive, setIsActive] = useState(false);
    const [suggestions] = useState([
        "MacBook Pro", "iPhone", "Textbooks", "Furniture", "Bike",
        "Calculus Textbook", "Gaming Chair", "Coffee Maker", "Backpack"
    ]);
    const searchRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsActive(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = (searchQuery = query) => {
        if (searchQuery.trim() && onSearch) {
            onSearch(searchQuery.trim());
            setIsActive(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter") {
            handleSearch();
        }
        if (e.key === "Escape") {
            setIsActive(false);
        }
    };

    const handleInputChange = (e) => {
        setQuery(e.target.value);
        setIsActive(true);
    };

    const handleSuggestionClick = (suggestion) => {
        setQuery(suggestion);
        handleSearch(suggestion);
    };

    const filteredSuggestions = suggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(query.toLowerCase()) && 
        suggestion.toLowerCase() !== query.toLowerCase()
    ).slice(0, 5);

    const clearSearch = () => {
        setQuery("");
        setIsActive(false);
        if (onSearch) {
            onSearch("");
        }
    };

    return (
        <div className="search-bar-wrapper" ref={searchRef}>
            <div className={`search-bar ${isActive ? 'search-active' : ''}`}>
                <div className="search-input-wrapper">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        className="search-input"
                        placeholder={placeholder}
                        value={query}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyPress}
                        onFocus={() => setIsActive(true)}
                    />
                    {query && (
                        <button className="clear-button" onClick={clearSearch}>
                            ✕
                        </button>
                    )}
                </div>
                <button className="search-button" onClick={() => handleSearch()}>
                    Search
                </button>
            </div>

            {isActive && showSuggestions && (
                <div className="search-suggestions">
                    {query && filteredSuggestions.length > 0 && (
                        <div className="suggestions-section">
                            <div className="suggestions-header">Suggestions</div>
                            {filteredSuggestions.map((suggestion, index) => (
                                <button
                                    key={index}
                                    className="suggestion-item"
                                    onClick={() => handleSuggestionClick(suggestion)}
                                >
                                    <span className="suggestion-icon">🔍</span>
                                    <span className="suggestion-text">{suggestion}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {recentSearches.length > 0 && !query && (
                        <div className="suggestions-section">
                            <div className="suggestions-header">Recent Searches</div>
                            {recentSearches.slice(0, 5).map((search, index) => (
                                <button
                                    key={index}
                                    className="suggestion-item"
                                    onClick={() => handleSuggestionClick(search)}
                                >
                                    <span className="suggestion-icon">🕐</span>
                                    <span className="suggestion-text">{search}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {!query && recentSearches.length === 0 && (
                        <div className="suggestions-section">
                            <div className="suggestions-placeholder">
                                Start typing to see suggestions...
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default SearchBar;
