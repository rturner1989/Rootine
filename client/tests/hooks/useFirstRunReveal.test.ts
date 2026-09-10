import { renderHook } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useFirstRunReveal } from '../../src/hooks/useFirstRunReveal'

const STORAGE_KEY = 'plantcare_tour_pending'

describe('useFirstRunReveal', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('returns isFirstRun=false when the flag is not set', () => {
    const { result } = renderHook(() => useFirstRunReveal())
    expect(result.current).toEqual({ isFirstRun: false })
  })

  it('returns isFirstRun=true on first render and clears the flag', () => {
    localStorage.setItem(STORAGE_KEY, 'true')

    const { result } = renderHook(() => useFirstRunReveal())

    expect(result.current).toEqual({ isFirstRun: true })
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('is idempotent under Strict Mode double-mount (reveal plays once)', () => {
    localStorage.setItem(STORAGE_KEY, 'true')

    const { result } = renderHook(() => useFirstRunReveal(), { wrapper: StrictMode })

    expect(result.current).toEqual({ isFirstRun: true })
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('returns isFirstRun=false on a fresh component instance mounted after the flag was cleared', () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    const { result: first, unmount: unmountFirst } = renderHook(() => useFirstRunReveal())
    expect(first.current.isFirstRun).toBe(true)
    unmountFirst()

    const { result: second } = renderHook(() => useFirstRunReveal())
    expect(second.current).toEqual({ isFirstRun: false })
  })

  it('caches the result across re-renders of the same component instance', () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    const { result, rerender } = renderHook(() => useFirstRunReveal())

    const firstCall = result.current
    rerender()
    const secondCall = result.current

    expect(secondCall).toBe(firstCall)
    expect(secondCall.isFirstRun).toBe(true)
  })
})
