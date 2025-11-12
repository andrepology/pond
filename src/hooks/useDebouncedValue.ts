import { useEffect, useState } from 'react'

/**
 * Returns a debounced version of the value that only updates after the specified delay.
 * Useful for decoupling expensive operations from immediate state changes.
 * 
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds before the value updates
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
