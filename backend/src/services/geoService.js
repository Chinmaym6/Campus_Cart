import fetch from 'node-fetch';

const GEO_API_KEY = process.env.GEO_API_KEY;
const GEOCODING_PROVIDER = process.env.GEOCODING_PROVIDER || 'geoapify';

// Get location info from IP address
export const getLocationFromIP = async (ip) => {
    try {
        if (!GEO_API_KEY) {
            console.warn('⚠️ GEO_API_KEY not configured, using fallback');
            return { city: 'Unknown', country: 'Unknown', latitude: null, longitude: null };
        }

        const response = await fetch(
            `https://api.geoapify.com/v1/ipinfo?apiKey=${GEO_API_KEY}&ip=${ip}`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        return {
            city: data.city?.name || 'Unknown',
            state: data.state?.name || '',
            country: data.country?.name || 'Unknown',
            latitude: data.location?.latitude || null,
            longitude: data.location?.longitude || null,
            timezone: data.timezone?.name || '',
            isp: data.isp?.name || ''
        };

    } catch (error) {
        console.error('❌ IP geolocation failed:', error);
        return { city: 'Unknown', country: 'Unknown', latitude: null, longitude: null };
    }
};

// Reverse geocoding - get address from coordinates
export const getAddressFromCoordinates = async (latitude, longitude) => {
    try {
        if (!GEO_API_KEY) {
            return 'Location coordinates provided';
        }

        const response = await fetch(
            `https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&format=json&apiKey=${GEO_API_KEY}`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            const result = data.results[0];
            return {
                formatted: result.formatted || 'Address not found',
                street: result.address_line1 || '',
                city: result.city || '',
                state: result.state || '',
                country: result.country || '',
                postal_code: result.postcode || ''
            };
        }

        return { formatted: 'Address not found' };

    } catch (error) {
        console.error('❌ Reverse geocoding failed:', error);
        return { formatted: 'Address lookup failed' };
    }
};

// Forward geocoding - get coordinates from address
export const getCoordinatesFromAddress = async (address) => {
    try {
        if (!GEO_API_KEY) {
            return null;
        }

        const encodedAddress = encodeURIComponent(address);
        const response = await fetch(
            `https://api.geoapify.com/v1/geocode/search?text=${encodedAddress}&format=json&apiKey=${GEO_API_KEY}`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            const result = data.results[0];
            return {
                latitude: parseFloat(result.lat),
                longitude: parseFloat(result.lon),
                formatted_address: result.formatted,
                accuracy: result.rank?.confidence || 0
            };
        }

        return null;

    } catch (error) {
        console.error('❌ Forward geocoding failed:', error);
        return null;
    }
};

// Calculate distance between two points (Haversine formula)
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

const toRadians = (degrees) => degrees * (Math.PI / 180);

// Find nearby items/users within radius
export const findNearbyItems = (userLat, userLon, items, radiusKm = 25) => {
    return items.filter(item => {
        if (!item.latitude || !item.longitude) return false;
        
        const distance = calculateDistance(
            userLat, userLon, 
            item.latitude, item.longitude
        );
        
        return distance <= radiusKm;
    }).map(item => ({
        ...item,
        distance: calculateDistance(userLat, userLon, item.latitude, item.longitude)
    })).sort((a, b) => a.distance - b.distance);
};

// Get user's university location
export const getUniversityLocation = async (universityName) => {
    try {
        const coordinates = await getCoordinatesFromAddress(`${universityName} university campus`);
        return coordinates;
    } catch (error) {
        console.error('❌ University location lookup failed:', error);
        return null;
    }
};

export default {
    getLocationFromIP,
    getAddressFromCoordinates,
    getCoordinatesFromAddress,
    calculateDistance,
    findNearbyItems,
    getUniversityLocation
};
