import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to debounce a value
 * @param {any} value - The value to debounce
 * @param {number} delay - The delay in milliseconds (default: 500)
 * @returns {any} The debounced value
 */
export const useDebounce = (value, delay = 500) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    const timeoutRef = useRef(null);

    useEffect(() => {
        // Clear existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Set new timeout
        timeoutRef.current = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Cleanup function
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [value, delay]);

    return debouncedValue;
};

/**
 * Custom hook for debounced search functionality
 * @param {string} initialValue - Initial search value
 * @param {number} delay - Debounce delay
 * @returns {object} Search state and handlers
 */
export const useDebouncedSearch = (initialValue = '', delay = 300) => {
    const [searchTerm, setSearchTerm] = useState(initialValue);
    const [isSearching, setIsSearching] = useState(false);
    const debouncedSearchTerm = useDebounce(searchTerm, delay);

    // Set searching state when search term changes
    useEffect(() => {
        if (searchTerm !== debouncedSearchTerm) {
            setIsSearching(true);
        } else {
            setIsSearching(false);
        }
    }, [searchTerm, debouncedSearchTerm]);

    const clearSearch = () => {
        setSearchTerm('');
    };

    return {
        searchTerm,
        setSearchTerm,
        debouncedSearchTerm,
        isSearching,
        clearSearch
    };
};

/**
 * Custom hook for debounced callback execution
 * @param {Function} callback - The callback to debounce
 * @param {number} delay - The delay in milliseconds
 * @param {Array} deps - Dependencies array
 * @returns {Function} Debounced callback function
 */
export const useDebouncedCallback = (callback, delay = 500, deps = []) => {
    const timeoutRef = useRef(null);

    const debouncedCallback = (...args) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            callback(...args);
        }, delay);
    };

    // Cleanup on unmount or deps change
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, deps);

    return debouncedCallback;
};

export default useDebounce;
