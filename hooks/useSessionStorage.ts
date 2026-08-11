'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

function useSessionStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isHydrated, setIsHydrated] = useState(false);
  // React state only updates on the next render, so consecutive setValue calls made
  // before a re-render (e.g. in a tight loop) would otherwise read the same stale
  // `storedValue`. Mirroring the latest value in a ref keeps each call in sync.
  const latestValueRef = useRef(storedValue);

  useEffect(() => {
    try {
      const item = window.sessionStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        latestValueRef.current = parsed;
        setStoredValue(parsed);
      }
    } catch (error) {
      console.error(`Error reading sessionStorage key "${key}":`, error);
    } finally {
      setIsHydrated(true);
    }
  }, [key]);

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore =
          value instanceof Function ? value(latestValueRef.current) : value;
        latestValueRef.current = valueToStore;
        setStoredValue(valueToStore);
        window.sessionStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error(`Error setting sessionStorage key "${key}":`, error);
      }
    },
    [key]
  );

  return [storedValue, setValue, isHydrated] as const;
}

export default useSessionStorage;
