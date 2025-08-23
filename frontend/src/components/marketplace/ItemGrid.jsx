import React from 'react';
import ItemCard from './ItemCard';
import LoadingSpinner from '../common/LoadingSpinner';
import './ItemGrid.css';

function ItemGrid({ 
    items = [], 
    loading = false, 
    error = null,
    emptyMessage = "No items found",
    emptyDescription = "Try adjusting your search or filters",
    onSave,
    onUnsave,
    savedItems = []
}) {
    
    if (loading) {
        return (
            <div className="item-grid-loading">
                <LoadingSpinner message="Loading items..." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="item-grid-error">
                <div className="error-icon">⚠️</div>
                <h3>Something went wrong</h3>
                <p>{error}</p>
                <button 
                    className="btn primary"
                    onClick={() => window.location.reload()}
                >
                    Try Again
                </button>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="item-grid-empty">
                <div className="empty-icon">🔍</div>
                <h3>{emptyMessage}</h3>
                <p>{emptyDescription}</p>
            </div>
        );
    }

    return (
        <div className="item-grid-container">
            <div className="item-grid">
                {items.map(item => (
                    <ItemCard
                        key={item.id}
                        item={item}
                        onSave={onSave}
                        onUnsave={onUnsave}
                        isSaved={savedItems.includes(item.id)}
                    />
                ))}
            </div>
        </div>
    );
}

export default ItemGrid;
