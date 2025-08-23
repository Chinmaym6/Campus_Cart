import React from 'react';
import MyPurchases from '../../components/profile/MyPurchases';
import { Helmet } from 'react-helmet-async';

function PurchasesPage() {
    return (
        <>
            <Helmet>
                <title>Purchase History - Campus Cart</title>
                <meta name="description" content="View your Campus Cart purchase history and track your orders." />
            </Helmet>
            
            <MyPurchases />
        </>
    );
}

export default PurchasesPage;
