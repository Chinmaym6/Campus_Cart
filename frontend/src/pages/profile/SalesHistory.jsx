import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
// import './SalesHistory.css';

const SalesHistory = () => {
    const { user } = useAuth();
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSalesHistory();
    }, []);

    const fetchSalesHistory = async () => {
        try {
            const response = await axios.get('/items/sales-history');
            setSales(response.data.sales || []);
        } catch (error) {
            console.error('Error fetching sales history:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="loading">Loading sales history...</div>;
    }

    return (
        <div className="sales-history-page">
            <div className="page-header">
                <h1>Sales History</h1>
                <p>Track all your successful sales</p>
            </div>

            <div className="sales-grid">
                {sales.length > 0 ? (
                    sales.map(sale => (
                        <div key={sale.id} className="sale-card">
                            <div className="sale-item-info">
                                <img 
                                    src={sale.item.images?.[0] || '/placeholder-image.jpg'} 
                                    alt={sale.item.title}
                                    className="sale-image"
                                />
                                <div className="sale-details">
                                    <h3>{sale.item.title}</h3>
                                    <p className="sale-price">${sale.finalPrice}</p>
                                    <p className="sale-date">
                                        Sold on {new Date(sale.soldDate).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <div className="buyer-info">
                                <p><strong>Buyer:</strong> {sale.buyer.name}</p>
                                <p><strong>Status:</strong> 
                                    <span className="status completed">Completed</span>
                                </p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="empty-state">
                        <h3>No sales yet</h3>
                        <p>Your sold items will appear here</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SalesHistory;
