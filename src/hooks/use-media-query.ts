import { useState, useEffect } from 'react';

/**
 * Subscribe to a CSS media query and get live updates.
 * @example const isMobile = useMediaQuery('(max-width: 767px)');
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);

    mql.addEventListener('change', handler);

    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/** Convenience: true when viewport < 768px */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}

/** Convenience: true when viewport ≥ 1024px */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}
