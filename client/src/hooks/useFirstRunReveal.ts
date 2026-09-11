import { useRef } from 'react'

const STORAGE_KEY = 'plantcare_tour_pending'

type FirstRunReveal = { isFirstRun: boolean }

export function useFirstRunReveal(): FirstRunReveal {
  const resultRef = useRef<FirstRunReveal | null>(null)

  if (resultRef.current === null) {
    const pending = typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY) === 'true'
    if (pending) window.localStorage.removeItem(STORAGE_KEY)
    resultRef.current = { isFirstRun: pending }
  }

  return resultRef.current
}
