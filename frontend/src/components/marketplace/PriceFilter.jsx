import React, { useState, useEffect } from 'react';
import './PriceFilter.css';

function PriceFilter({ 
    minPrice = '', 
    maxPrice = '', 
    onPriceChange,
    priceRange = { min: 0, max: 1000 },
    showPresets = true 
}) {
    const [localMinPrice, setLocalMinPrice] = useState(minPrice);
    const [localMaxPrice, setLocalMaxPrice] = useState(maxPrice);
    const [isExpanded, setIsExpanded] = useState(true);
    const [inputMode, setInputMode] = useState('preset'); // 'preset' or 'custom'

    // Price presets
    const pricePresets = [
        { label: 'Under $25', min: 0, max: 25 },
        { label: '$25 - $50', min: 25, max: 50 },
        { label: '$50 - $100', min: 50, max: 100 },
        { label: '$100 - $250', min: 100, max: 250 },
        { label: '$250 - $500', min: 250, max: 500 },
        { label: 'Over $500', min: 500, max: null }
    ];

    useEffect(() => {
        setLocalMinPrice(minPrice);
        setLocalMaxPrice(maxPrice);
    }, [minPrice, maxPrice]);

    const handlePresetClick = (preset) => {
        setLocalMinPrice(preset.min);
        setLocalMaxPrice(preset.max || '');
        onPriceChange(preset.min, preset.max || '');
    };

    const handleCustomPriceChange = (type, value) => {
        const numValue = value === '' ? '' : parseFloat(value);
        
        if (type === 'min') {
            setLocalMinPrice(numValue);
        } else {
            setLocalMaxPrice(numValue);
        }
    };

    const applyCustomPrice = () => {
        // Validate prices
        const min = localMinPrice === '' ? '' : parseFloat(localMinPrice);
        const max = localMaxPrice === '' ? '' : parseFloat(localMaxPrice);
        
        if (min !== '' && max !== '' && min > max) {
            // Swap if min is greater than max
            onPriceChange(max, min);
            setLocalMinPrice(max);
            setLocalMaxPrice(min);
        } else {
            onPriceChange(min, max);
        }
    };

    const clearPrices = () => {
        setLocalMinPrice('');
        setLocalMaxPrice('');
        onPriceChange('', '');
    };

    const isPresetSelected = (preset) => {
        const min = parseFloat(localMinPrice) || 0;
        const max = parseFloat(localMaxPrice) || null;
        return min === preset.min && max === preset.max;
    };

    const hasActiveFilter = localMinPrice !== '' || localMaxPrice !== '';

    const formatPrice = (price) => {
        if (price === '' || price === null || price === undefined) return '';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(price);
    };

    return (
        <div className="price-filter">
            <div className="filter-header" onClick={() => setIsExpanded(!isExpanded)}>
                <h3>💰 Price Range</h3>
                <div className="header-actions">
                    {hasActiveFilter && (
                        <span className="active-indicator">•</span>
                    )}
                    <button className="toggle-btn">
                        {isExpanded ? '−' : '+'}
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="filter-content">
                    {/* Mode Toggle */}
                    <div className="mode-toggle">
                        <button
                            className={`mode-btn ${inputMode === 'preset' ? 'active' : ''}`}
                            onClick={() => setInputMode('preset')}
                        >
                            Quick Select
                        </button>
                        <button
                            className={`mode-btn ${inputMode === 'custom' ? 'active' : ''}`}
                            onClick={() => setInputMode('custom')}
                        >
                            Custom Range
                        </button>
                    </div>

                    {/* Current Selection Display */}
                    {hasActiveFilter && (
                        <div className="current-selection">
                            <span className="selection-label">Current:</span>
                            <span className="selection-value">
                                {formatPrice(localMinPrice)} - {formatPrice(localMaxPrice) || 'No limit'}
                            </span>
                            <button className="clear-btn" onClick={clearPrices}>
                                ✕
                            </button>
                        </div>
                    )}

                    {/* Preset Mode */}
                    {inputMode === 'preset' && showPresets && (
                        <div className="price-presets">
                            {pricePresets.map((preset, index) => (
                                <button
                                    key={index}
                                    className={`preset-btn ${isPresetSelected(preset) ? 'active' : ''}`}
                                    onClick={() => handlePresetClick(preset)}
                                >
                                    <span className="preset-label">{preset.label}</span>
                                    {isPresetSelected(preset) && (
                                        <span className="check-icon">✓</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Custom Mode */}
                    {inputMode === 'custom' && (
                        <div className="custom-price-inputs">
                            <div className="price-input-group">
                                <label htmlFor="min-price">Minimum Price</label>
                                <div className="price-input-wrapper">
                                    <span className="currency-symbol">$</span>
                                    <input
                                        id="min-price"
                                        type="number"
                                        placeholder="0"
                                        min="0"
                                        step="0.01"
                                        value={localMinPrice}
                                        onChange={(e) => handleCustomPriceChange('min', e.target.value)}
                                        onBlur={applyCustomPrice}
                                        onKeyPress={(e) => e.key === 'Enter' && applyCustomPrice()}
                                    />
                                </div>
                            </div>

                            <div className="price-separator">to</div>

                            <div className="price-input-group">
                                <label htmlFor="max-price">Maximum Price</label>
                                <div className="price-input-wrapper">
                                    <span className="currency-symbol">$</span>
                                    <input
                                        id="max-price"
                                        type="number"
                                        placeholder="No limit"
                                        min="0"
                                        step="0.01"
                                        value={localMaxPrice}
                                        onChange={(e) => handleCustomPriceChange('max', e.target.value)}
                                        onBlur={applyCustomPrice}
                                        onKeyPress={(e) => e.key === 'Enter' && applyCustomPrice()}
                                    />
                                </div>
                            </div>

                            <div className="custom-actions">
                                <button 
                                    className="apply-btn"
                                    onClick={applyCustomPrice}
                                >
                                    Apply
                                </button>
                                <button 
                                    className="clear-btn-text"
                                    onClick={clearPrices}
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Price Distribution (Optional) */}
                    <div className="price-stats">
                        <div className="stats-header">💡 Price Tips</div>
                        <div className="price-tips">
                            <div className="tip-item">
                                <span className="tip-icon">📈</span>
                                <span>Most items under $100</span>
                            </div>
                            <div className="tip-item">
                                <span className="tip-icon">🔥</span>
                                <span>Best deals in $25-$50 range</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PriceFilter;
