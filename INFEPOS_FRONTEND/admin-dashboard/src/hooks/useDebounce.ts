import { useState, useEffect } from 'react';

/**
 * Custom hook to debounce fast-changing values like search input bars.
 * Prevents rapid multi-keystroke API calls and eliminates ThrottlerException (429 Too Many Requests).
 *
 * @param value The raw input value
 * @param delayMs Debounce delay in milliseconds (default: 400ms)
 */
export function useDebounce<T>(value: T, delayMs: number = 400): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delayMs]);

  return debouncedValue;
}

export default useDebounce;
