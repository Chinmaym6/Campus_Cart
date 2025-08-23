import React, { useState, useEffect } from 'react';
import { FiArrowUp } from 'react-icons/fi';
import './BackToTop.css';

const BackToTop = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [scrollProgress, setScrollProgress] = useState(0);

    useEffect(() => {
        const toggleVisibility = () => {
            const scrolled = window.pageYOffset;
            const maxHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = (scrolled / maxHeight) * 100;

            setScrollProgress(progress);
            setIsVisible(scrolled > 300);
        };

        const throttledToggleVisibility = throttle(toggleVisibility, 100);

        window.addEventListener('scroll', throttledToggleVisibility);

        return () => {
            window.removeEventListener('scroll', throttledToggleVisibility);
        };
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    // Throttle function to optimize scroll performance
    function throttle(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    if (!isVisible) return null;

    return (
        <button
            className="back-to-top"
            onClick={scrollToTop}
            title="Back to top"
            aria-label="Scroll back to top"
        >
            <div className="progress-ring">
                <svg width="44" height="44" className="progress-circle">
                    <circle
                        cx="22"
                        cy="22"
                        r="18"
                        stroke="rgba(255, 255, 255, 0.3)"
                        strokeWidth="2"
                        fill="transparent"
                    />
                    <circle
                        cx="22"
                        cy="22"
                        r="18"
                        stroke="white"
                        strokeWidth="2"
                        fill="transparent"
                        strokeDasharray={`${2 * Math.PI * 18}`}
                        strokeDashoffset={`${2 * Math.PI * 18 * (1 - scrollProgress / 100)}`}
                        className="progress-bar"
                    />
                </svg>
            </div>
            <FiArrowUp className="back-to-top-icon" />
        </button>
    );
};

export default BackToTop;
