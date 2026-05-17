import React, { useEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';

/**
 * Animates a number from 0 to `end` when the element enters the viewport.
 */
export default function CountUp({ end, suffix = '', duration = 2000 }) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.3 });
  const countRef = useRef(null);

  useEffect(() => {
    if (!inView || !countRef.current) return;
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        countRef.current.textContent = `${end.toLocaleString()}${suffix}`;
        clearInterval(timer);
      } else {
        countRef.current.textContent = `${Math.floor(start).toLocaleString()}${suffix}`;
      }
    }, 16);
    return () => clearInterval(timer);
  }, [inView, end, suffix, duration]);

  return (
    <span ref={ref}>
      <span ref={countRef}>0{suffix}</span>
    </span>
  );
}
