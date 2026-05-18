import { useState, useEffect } from 'react';

/**
 * Returns true while window width <= breakpoint (px).
 * Defaults to mobile breakpoint of 768px.
 */
export function useMediaQuery(query = '(max-width: 768px)') {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql     = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/**
 * Visual Viewport height — keeps chat input above mobile keyboard.
 * Sets --keyboard-height CSS var on document root.
 */
export function useVisualViewport() {
  useEffect(() => {
    if (!window.visualViewport) return;
    const handler = () => {
      const kbHeight = window.innerHeight - window.visualViewport.height;
      document.documentElement.style.setProperty('--keyboard-height', `${kbHeight}px`);
    };
    window.visualViewport.addEventListener('resize', handler);
    return () => window.visualViewport.removeEventListener('resize', handler);
  }, []);
}
