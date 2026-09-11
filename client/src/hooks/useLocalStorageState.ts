import { type Dispatch, type SetStateAction, useEffect, useState } from 'react'

// State backed by localStorage: lazy-reads once on mount, writes on every
// change. Value must be JSON-serialisable. Storage failures (private mode,
// quota) degrade to in-memory state rather than throwing.
export function useLocalStorageState<T>(key: string, defaultValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue
    try {
      const stored = window.localStorage.getItem(key)
      return stored == null ? defaultValue : (JSON.parse(stored) as T)
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
