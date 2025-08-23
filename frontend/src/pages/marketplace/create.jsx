import React from 'react';
import CreateListing from '../../components/marketplace/CreateListing';
import { Helmet } from 'react-helmet-async';

function CreateListingPage() {
    return (
        <>
            <Helmet>
                <title>Sell an Item - Campus Cart Marketplace</title>
                <meta name="description" content="Create a new listing to sell your item on Campus Cart marketplace. Connect with fellow students and sell items quickly and safely." />
            </Helmet>
            
            <CreateListing />
        </>
    );
}

export default CreateListingPage;
