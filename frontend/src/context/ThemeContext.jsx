import React, { createContext, useContext, useEffect, useState } from 'react';

// Create Theme Context
const ThemeContext = createContext(null);

// Theme Provider Component
export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState('light');
    const [fontSize, setFontSize] = useState('medium');

    // Initialize theme from localStorage
    useEffect(() => {
        const savedTheme = localStorage.getItem('campus-cart-theme') || 'light';
        const savedFontSize = localStorage.getItem('campus-cart-font-size') || 'medium';
        
        setTheme(savedTheme);
        setFontSize(savedFontSize);
        
        // Apply theme to document
        document.documentElement.setAttribute('data-theme', savedTheme);
        document.documentElement.setAttribute('data-font-size', savedFontSize);
    }, []);

    // Toggle between light and dark theme
    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('campus-cart-theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
    };

    // Set specific theme
    const setThemeMode = (mode) => {
        if (['light', 'dark', 'auto'].includes(mode)) {
            setTheme(mode);
            localStorage.setItem('campus-cart-theme', mode);
            document.documentElement.setAttribute('data-theme', mode);
        }
    };

    // Font size controls
    const increaseFontSize = () => {
        const sizes = ['small', 'medium', 'large'];
        const currentIndex = sizes.indexOf(fontSize);
        if (currentIndex < sizes.length - 1) {
            const newSize = sizes[currentIndex + 1];
            setFontSize(newSize);
            localStorage.setItem('campus-cart-font-size', newSize);
            document.documentElement.setAttribute('data-font-size', newSize);
        }
    };

    const decreaseFontSize = () => {
        const sizes = ['small', 'medium', 'large'];
        const currentIndex = sizes.indexOf(fontSize);
        if (currentIndex > 0) {
            const newSize = sizes[currentIndex - 1];
            setFontSize(newSize);
            localStorage.setItem('campus-cart-font-size', newSize);
            document.documentElement.setAttribute('data-font-size', newSize);
        }
    };

    const setFontSizeMode = (size) => {
        if (['small', 'medium', 'large'].includes(size)) {
            setFontSize(size);
            localStorage.setItem('campus-cart-font-size', size);
            document.documentElement.setAttribute('data-font-size', size);
        }
    };

    // System preference detection
    useEffect(() => {
        if (theme === 'auto') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = (e) => {
                const systemTheme = e.matches ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', systemTheme);
            };

            mediaQuery.addEventListener('change', handleChange);
            handleChange(mediaQuery);

            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, [theme]);

    const value = {
        theme,
        fontSize,
        toggleTheme,
        setThemeMode,
        increaseFontSize,
        decreaseFontSize,
        setFontSizeMode,
        isDarkMode: theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

// Custom hook to use theme context
export const useTheme = () => {
    const context = useContext(ThemeContext);
    
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }

    return context;
};

export default ThemeContext;
