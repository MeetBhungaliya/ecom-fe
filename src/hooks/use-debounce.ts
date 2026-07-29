import { useState, useEffect } from 'react';

/**
 * Debounce a value by a given delay.
 * @example const debouncedSearch = useDebounce(searchTerm, 300);
 */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}
