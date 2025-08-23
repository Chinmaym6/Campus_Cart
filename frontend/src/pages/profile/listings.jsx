import React from 'react';
import MyListings from '../../components/profile/MyListings';
import { Helmet } from 'react-helmet-async';

function ListingsPage() {
    return (
        <>
            <Helmet>
                <title>My Listings - Campus Cart</title>
                <meta name="description" content="Manage your Campus Cart marketplace listings. View, edit, and track the performance of your items." />
            </Helmet>
            
            <MyListings />
        </>
    );
}

export default ListingsPage;
