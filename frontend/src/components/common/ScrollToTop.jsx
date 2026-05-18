import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Scrolls window to top on every route change.
 * Also handles hash links (e.g. /#features) by scrolling to the element.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const hasScrolled         = useRef(false);

  useEffect(() => {
    hasScrolled.current = false;

    if (hash) {
      const id = hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        hasScrolled.current = true;
      }
    }

    if (!hasScrolled.current) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [pathname, hash]);

  return null;
}
