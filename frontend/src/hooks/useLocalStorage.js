import { useState, useCallback, useEffect } from 'react';

/**
 * Custom hook for local storage management
 * @param {string} key - The localStorage key
 * @param {any} initialValue - Initial value if key doesn't exist
 * @returns {Array} [value, setValue, removeValue]
 */
export const useLocalStorage = (key, initialValue) => {
    // State to store our value
    const [storedValue, setStoredValue] = useState(() => {
        if (typeof window === 'undefined') {
            return initialValue;
        }

        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(`Error reading localStorage key "${key}":`, error);
            return initialValue;
        }
    });

    // Return a wrapped version of useState's setter function that persists the new value to localStorage
    const setValue = useCallback((value) => {
        try {
            // Allow value to be a function so we have the same API as useState
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            
            // Save state
            setStoredValue(valueToStore);
            
            // Save to local storage
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
                
                // Dispatch custom event for cross-tab synchronization
                window.dispatchEvent(new CustomEvent('local-storage', {
                    detail: { key, newValue: valueToStore }
                }));
            }
        } catch (error) {
            console.error(`Error setting localStorage key "${key}":`, error);
        }
    }, [key, storedValue]);

    // Remove value from localStorage
    const removeValue = useCallback(() => {
        try {
            setStoredValue(initialValue);
            
            if (typeof window !== 'undefined') {
                window.localStorage.removeItem(key);
                
                // Dispatch custom event for cross-tab synchronization
                window.dispatchEvent(new CustomEvent('local-storage', {
                    detail: { key, newValue: initialValue }
                }));
            }
        } catch (error) {
            console.error(`Error removing localStorage key "${key}":`, error);
        }
    }, [key, initialValue]);

    // Listen for changes from other tabs
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleStorageChange = (e) => {
            if (e.key === key && e.newValue !== null) {
                try {
                    setStoredValue(JSON.parse(e.newValue));
                } catch (error) {
                    console.error(`Error parsing localStorage value for key "${key}":`, error);
                }
            }
        };

        const handleCustomStorageChange = (e) => {
            if (e.detail.key === key) {
                setStoredValue(e.detail.newValue);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('local-storage', handleCustomStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('local-storage', handleCustomStorageChange);
        };
    }, [key]);

    return [storedValue, setValue, removeValue];
};

/**
 * Hook for storing user preferences
 * @param {Object} defaultPreferences - Default user preferences
 * @returns {Object} Preferences state and methods
 */
export const useUserPreferences = (defaultPreferences = {}) => {
    const [preferences, setPreferences, removePreferences] = useLocalStorage(
        'userPreferences', 
        defaultPreferences
    );

    const updatePreference = useCallback((key, value) => {
        setPreferences(prev => ({
            ...prev,
            [key]: value
        }));
    }, [setPreferences]);

    const updatePreferences = useCallback((updates) => {
        setPreferences(prev => ({
            ...prev,
            ...updates
        }));
    }, [setPreferences]);

    const getPreference = useCallback((key, fallback = null) => {
        return preferences[key] ?? fallback;
    }, [preferences]);

    const resetPreferences = useCallback(() => {
        setPreferences(defaultPreferences);
    }, [setPreferences, defaultPreferences]);

    return {
        preferences,
        updatePreference,
        updatePreferences,
        getPreference,
        resetPreferences,
        removePreferences
    };
};

/**
 * Hook for managing theme preferences
 * @returns {Object} Theme state and methods
 */
export const useTheme = () => {
    const [theme, setTheme] = useLocalStorage('theme', 'light');

    const toggleTheme = useCallback(() => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    }, [setTheme]);

    const setLightTheme = useCallback(() => {
        setTheme('light');
    }, [setTheme]);

    const setDarkTheme = useCallback(() => {
        setTheme('dark');
    }, [setTheme]);

    // Apply theme to document
    useEffect(() => {
        if (typeof window !== 'undefined') {
            document.documentElement.setAttribute('data-theme', theme);
            document.documentElement.classList.toggle('dark', theme === 'dark');
        }
    }, [theme]);

    return {
        theme,
        setTheme,
        toggleTheme,
        setLightTheme,
        setDarkTheme,
        isDark: theme === 'dark',
        isLight: theme === 'light'
    };
};

export default useLocalStorage;
