import React from 'react';
import CreateRoommatePost from '../../components/roommate/CreateRoommatePost';
import { Helmet } from 'react-helmet-async';

function CreateRoommatePostPage() {
    return (
        <>
            <Helmet>
                <title>Find a Roommate - Campus Cart</title>
                <meta name="description" content="Create a roommate post to find compatible students to live with. Use our smart matching system to connect with the perfect roommate." />
            </Helmet>
            
            <CreateRoommatePost />
        </>
    );
}

export default CreateRoommatePostPage;
