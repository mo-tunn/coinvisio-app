import React, { useState, useEffect } from 'react';

/**
 * Animation Component for Numbers
 * Animates a count from 0 to end value with easing
 */
const CountUp = ({ end, duration = 2000, suffix = '', prefix = '', decimals = 0, start = false }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!start) return;

        let startTime = null;
        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const easeOut = (t) => 1 - Math.pow(1 - t, 3);
            const currentProgress = Math.min(progress / duration, 1);

            const nextCount = easeOut(currentProgress) * end;
            setCount(nextCount);

            if (currentProgress < 1) {
                window.requestAnimationFrame(animate);
            } else {
                setCount(end);
            }
        };

        window.requestAnimationFrame(animate);
    }, [start, end, duration]);

    return (
        <>
            {prefix}
            {count.toFixed(decimals)}
            {suffix}
        </>
    );
};

export default CountUp;
