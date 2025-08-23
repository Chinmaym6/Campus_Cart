import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for geolocation functionality
 * @param {Object} options - Geolocation options
 * @returns {Object} Location state and methods
 */
export const useGeolocation = (options = {}) => {
    const [location, setLocation] = useState({
        latitude: null,
        longitude: null,
        accuracy: null,
        timestamp: null
    });
    
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const watchIdRef = useRef(null);

    // Default options
    const defaultOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
        ...options
    };

    // Check if geolocation is supported
    useEffect(() => {
        setIsSupported('geolocation' in navigator);
    }, []);

    // Success callback
    const onSuccess = useCallback((position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const { timestamp } = position;

        setLocation({
            latitude,
            longitude,
            accuracy,
            timestamp
        });
        
        setError(null);
        setLoading(false);
    }, []);

    // Error callback
    const onError = useCallback((error) => {
        let errorMessage = 'An unknown error occurred';

        switch (error.code) {
            case error.PERMISSION_DENIED:
                errorMessage = 'Location access denied by user';
                break;
            case error.POSITION_UNAVAILABLE:
                errorMessage = 'Location information unavailable';
                break;
            case error.TIMEOUT:
                errorMessage = 'Location request timed out';
                break;
            default:
                errorMessage = error.message || errorMessage;
        }

        setError({
            code: error.code,
            message: errorMessage
        });
        
        setLoading(false);
    }, []);

    // Get current position
    const getCurrentPosition = useCallback(() => {
        if (!isSupported) {
            setError({
                code: 0,
                message: 'Geolocation is not supported by this browser'
            });
            return;
        }

        setLoading(true);
        setError(null);

        navigator.geolocation.getCurrentPosition(
            onSuccess,
            onError,
            defaultOptions
        );
    }, [isSupported, onSuccess, onError, defaultOptions]);

    // Watch position
    const watchPosition = useCallback(() => {
        if (!isSupported) {
            setError({
                code: 0,
                message: 'Geolocation is not supported by this browser'
            });
            return;
        }

        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
        }

        setLoading(true);
        setError(null);

        watchIdRef.current = navigator.geolocation.watchPosition(
            onSuccess,
            onError,
            defaultOptions
        );
    }, [isSupported, onSuccess, onError, defaultOptions]);

    // Clear watch
    const clearWatch = useCallback(() => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearWatch();
        };
    }, [clearWatch]);

    // Calculate distance between two coordinates
    const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
        const R = 6371; // Earth's radius in kilometers
        const dLat = toRadians(lat2 - lat1);
        const dLon = toRadians(lon2 - lon1);
        
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }, []);

    // Helper function to convert degrees to radians
    const toRadians = (degrees) => degrees * (Math.PI/180);

    return {
        location,
        error,
        loading,
        isSupported,
        getCurrentPosition,
        watchPosition,
        clearWatch,
        calculateDistance
    };
};

/**
 * Hook for getting user's location with automatic fetching
 * @param {Object} options - Geolocation options
 * @param {boolean} autoFetch - Whether to automatically fetch location on mount
 * @returns {Object} Location state and methods
 */
export const useAutoGeolocation = (options = {}, autoFetch = true) => {
    const geolocation = useGeolocation(options);

    useEffect(() => {
        if (autoFetch && geolocation.isSupported) {
            geolocation.getCurrentPosition();
        }
    }, [autoFetch, geolocation.isSupported]);

    return geolocation;
};

export default useGeolocation;
