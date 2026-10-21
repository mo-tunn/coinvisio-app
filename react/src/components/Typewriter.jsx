import React, { useState, useEffect } from 'react';

/**
 * Typing Effect Component
 * Creates a typewriter animation effect for text
 */
const Typewriter = ({ text, onComplete, speed = 30, startDelay = 0 }) => {
    const [displayedText, setDisplayedText] = useState('');
    const [started, setStarted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setStarted(true), startDelay);
        return () => clearTimeout(timer);
    }, [startDelay]);

    useEffect(() => {
        if (!started) return;

        let index = 0;
        const interval = setInterval(() => {
            if (index <= text.length) {
                setDisplayedText(text.slice(0, index));
                index++;
            } else {
                clearInterval(interval);
                if (onComplete) onComplete();
            }
        }, speed);

        return () => clearInterval(interval);
    }, [text, speed, started, onComplete]);

    return <span>{displayedText}</span>;
};

export default Typewriter;
