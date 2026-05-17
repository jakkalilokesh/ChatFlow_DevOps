import { useEffect, useCallback } from 'react';

/**
 * Global keyboard shortcut handler.
 * @param {Object} shortcuts - Map of key combo → handler fn
 * @param {boolean} enabled - Whether shortcuts are active
 */
export function useKeyboardShortcuts(shortcuts, enabled = true) {
  const handleKeyDown = useCallback(
    (e) => {
      if (!enabled) return;

      // Build key combo string
      const parts = [];
      if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      if (e.key !== 'Control' && e.key !== 'Meta' && e.key !== 'Alt' && e.key !== 'Shift') {
        parts.push(e.key);
      }
      const combo = parts.join('+');

      const handler = shortcuts[combo];
      if (handler) {
        // Prevent default only for known shortcuts
        e.preventDefault();
        handler(e);
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export default useKeyboardShortcuts;
