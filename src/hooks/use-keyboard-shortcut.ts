import { useEffect, useRef } from 'react';

type KeyCombo = {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
};

/**
 * Register a keyboard shortcut handler.
 *
 * @example
 * // ⌘K to open command palette
 * useKeyboardShortcut({ key: 'k', meta: true }, () => toggleCommandPalette());
 *
 * // ⌘B to toggle sidebar
 * useKeyboardShortcut({ key: 'b', meta: true }, () => toggleSidebar());
 */
export function useKeyboardShortcut(
  combo: KeyCombo,
  handler: (e: KeyboardEvent) => void,
  enabled = true,
) {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!enabled) return;

    const listener = (e: KeyboardEvent) => {
      const matchesKey = e.key.toLowerCase() === combo.key.toLowerCase();
      const matchesMeta = combo.meta ? e.metaKey || e.ctrlKey : true;
      const matchesCtrl = combo.ctrl ? e.ctrlKey : true;
      const matchesShift = combo.shift ? e.shiftKey : true;
      const matchesAlt = combo.alt ? e.altKey : true;

      // Don't fire in inputs unless it's a meta combo
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName);
      if (isInput && !combo.meta && !combo.ctrl) return;

      if (matchesKey && matchesMeta && matchesCtrl && matchesShift && matchesAlt) {
        e.preventDefault();
        handlerRef.current(e);
      }
    };

    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [combo.key, combo.meta, combo.ctrl, combo.shift, combo.alt, enabled]);
}
