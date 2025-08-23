import React from 'react';
import SavedItems from '../../components/profile/SavedItems';
import { Helmet } from 'react-helmet-async';

function SavedItemsPage() {
    return (
        <>
            <Helmet>
                <title>Saved Items - Campus Cart</title>
                <meta name="description" content="View and manage your saved items on Campus Cart marketplace." />
            </Helmet>
            
            <SavedItems />
        </>
    );
}

export default SavedItemsPage;
