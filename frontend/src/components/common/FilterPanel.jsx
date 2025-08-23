import React, { useState } from "react";
import "./FilterPanel.css";

function FilterPanel({ onFilter, categories = [] }) {
    const [filters, setFilters] = useState({
        category: "",
        minPrice: "",
        maxPrice: "",
        condition: "",
        location: "",
        sortBy: ""
    });

    const [isExpanded, setIsExpanded] = useState(true);

    const conditions = [
        { value: "new", label: "New" },
        { value: "like_new", label: "Like New" },
        { value: "good", label: "Good" },
        { value: "fair", label: "Fair" },
        { value: "poor", label: "Poor" }
    ];

    const sortOptions = [
        { value: "newest", label: "Newest First" },
        { value: "oldest", label: "Oldest First" },
        { value: "price_low", label: "Price: Low to High" },
        { value: "price_high", label: "Price: High to Low" },
        { value: "distance", label: "Nearest First" }
    ];

    const handleChange = (e) => {
        const { name, value } = e.target;
        const newFilters = { ...filters, [name]: value };
        setFilters(newFilters);
        
        // Auto-apply filters on change
        if (onFilter) {
            onFilter(newFilters);
        }
    };

    const handleApplyFilters = () => {
        if (onFilter) {
            onFilter(filters);
        }
    };

    const handleResetFilters = () => {
        const resetFilters = {
            category: "",
            minPrice: "",
            maxPrice: "",
            condition: "",
            location: "",
            sortBy: ""
        };
        setFilters(resetFilters);
        if (onFilter) {
            onFilter(resetFilters);
        }
    };

    const hasActiveFilters = Object.values(filters).some(value => value !== "");

    return (
        <div className="filter-panel">
            <div className="filter-header" onClick={() => setIsExpanded(!isExpanded)}>
                <h3 className="filter-title">🔍 Filters & Sort</h3>
                <button className="toggle-button">
                    {isExpanded ? "−" : "+"}
                </button>
            </div>

            {isExpanded && (
                <div className="filter-content">
                    {/* Category Filter */}
                    <div className="filter-group">
                        <label htmlFor="category">Category</label>
                        <select
                            id="category"
                            name="category"
                            value={filters.category}
                            onChange={handleChange}
                            className="filter-select"
                        >
                            <option value="">All Categories</option>
                            <option value="textbooks">Textbooks</option>
                            <option value="electronics">Electronics</option>
                            <option value="furniture">Furniture</option>
                            <option value="clothing">Clothing</option>
                            <option value="kitchen-dining">Kitchen & Dining</option>
                            <option value="sports-recreation">Sports & Recreation</option>
                            <option value="services">Services</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    {/* Price Range */}
                    <div className="filter-group">
                        <label>Price Range</label>
                        <div className="price-range">
                            <input
                                type="number"
                                name="minPrice"
                                value={filters.minPrice}
                                onChange={handleChange}
                                className="filter-input price-input"
                                placeholder="Min"
                                min="0"
                            />
                            <span className="price-separator">to</span>
                            <input
                                type="number"
                                name="maxPrice"
                                value={filters.maxPrice}
                                onChange={handleChange}
                                className="filter-input price-input"
                                placeholder="Max"
                                min="0"
                            />
                        </div>
                    </div>

                    {/* Condition Filter */}
                    <div className="filter-group">
                        <label htmlFor="condition">Condition</label>
                        <select
                            id="condition"
                            name="condition"
                            value={filters.condition}
                            onChange={handleChange}
                            className="filter-select"
                        >
                            <option value="">Any Condition</option>
                            {conditions.map(condition => (
                                <option key={condition.value} value={condition.value}>
                                    {condition.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Sort By */}
                    <div className="filter-group">
                        <label htmlFor="sortBy">Sort By</label>
                        <select
                            id="sortBy"
                            name="sortBy"
                            value={filters.sortBy}
                            onChange={handleChange}
                            className="filter-select"
                        >
                            <option value="">Default</option>
                            {sortOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Action Buttons */}
                    <div className="filter-actions">
                        <button 
                            className="filter-btn reset-btn" 
                            onClick={handleResetFilters}
                            disabled={!hasActiveFilters}
                        >
                            Clear All
                        </button>
                        <button 
                            className="filter-btn apply-btn" 
                            onClick={handleApplyFilters}
                        >
                            Apply Filters
                        </button>
                    </div>

                    {hasActiveFilters && (
                        <div className="active-filters">
                            <span className="active-filters-label">Active filters:</span>
                            {Object.entries(filters).map(([key, value]) => 
                                value && (
                                    <span key={key} className="filter-tag">
                                        {key}: {value}
                                    </span>
                                )
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default FilterPanel;
