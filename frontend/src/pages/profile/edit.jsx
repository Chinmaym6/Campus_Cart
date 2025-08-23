import React from 'react';
import EditProfile from '../../components/profile/EditProfile';
import { Helmet } from 'react-helmet-async';

function EditProfilePage() {
    return (
        <>
            <Helmet>
                <title>Edit Profile - Campus Cart</title>
                <meta name="description" content="Update your Campus Cart profile information, preferences, and settings." />
            </Helmet>
            
            <EditProfile />
        </>
    );
}

export default EditProfilePage;
