import React from 'react';
import MatchingResults from '../../components/roommate/MatchingResults';
import { Helmet } from 'react-helmet-async';

function RoommateMatchesPage() {
    return (
        <>
            <Helmet>
                <title>Your Roommate Matches - Campus Cart</title>
                <meta name="description" content="View your personalized roommate matches based on compatibility preferences and lifestyle factors." />
            </Helmet>
            
            <MatchingResults />
        </>
    );
}

export default RoommateMatchesPage;
