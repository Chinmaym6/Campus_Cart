import React from 'react';
import { useParams } from 'react-router-dom';
import RoommateProfile from '../../../components/roommate/RoommateProfile';
import { Helmet } from 'react-helmet-async';

function RoommatePostPage() {
    const { id } = useParams();

    return (
        <>
            <Helmet>
                <title>Roommate Post - Campus Cart</title>
                <meta name="description" content="View detailed information about this roommate post and connect with potential roommates." />
            </Helmet>
            
            <RoommateProfile postId={id} />
        </>
    );
}

export default RoommatePostPage;
