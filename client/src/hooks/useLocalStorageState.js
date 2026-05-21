import { useEffect, useState } from 'react'

// State backed by localStorage: lazy-reads once on mount, writes on every
// change. Value must be JSON-serialisable. Storage failures (private mode,
// quota) degrade to in-memory state rather than throwing.
export function useLocalStorageState(key, defaultValue) {
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') return defaultValue
    try {
      const stored = window.localStorage.getItem(key)
      return stored == null ? defaultValue : JSON.parse(stored)
    } catch {
      return defaultValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Non-fatal — state still works for this session.
    }
  }, [key, value])

  return [value, setValue]
}
