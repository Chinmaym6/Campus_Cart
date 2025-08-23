import React from 'react';
import { useParams } from 'react-router-dom';
import ItemDetails from '../../../components/marketplace/ItemDetails';
import { Helmet } from 'react-helmet-async';

function ItemDetailsPage() {
    const { id } = useParams();

    return (
        <>
            <Helmet>
                <title>Item Details - Campus Cart Marketplace</title>
                <meta name="description" content="View detailed information about this item on Campus Cart marketplace." />
            </Helmet>
            
            <ItemDetails itemId={id} />
        </>
    );
}

export default ItemDetailsPage;
