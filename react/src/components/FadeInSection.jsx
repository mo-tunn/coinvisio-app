import React, { useState, useEffect, useRef } from 'react';

/**
 * Reusable Fade In/Out Section Component
 * Animates children when they come into view
 */
const FadeInSection = ({ children, className = "" }) => {
    const [isVisible, setVisible] = useState(false);
    const domRef = useRef();

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setVisible(true);
                        if (entry.target) observer.unobserve(entry.target);
                    }
                });
            },
            {
                threshold: 0,
                rootMargin: "0px 0px -50px 0px"
            }
        );

        const currentElement = domRef.current;
        if (currentElement) {
            observer.observe(currentElement);
        }

        return () => {
            if (currentElement) {
                observer.unobserve(currentElement);
            }
        };
    }, []);

    return (
        <div
            ref={domRef}
            className={`transition-all duration-1000 ease-out transform ${isVisible
                ? 'opacity-100 translate-y-0 blur-0 scale-100'
                : 'opacity-0 translate-y-12 blur-sm scale-95'
                } ${className}`}
        >
            {children}
        </div>
    );
};

export default FadeInSection;
