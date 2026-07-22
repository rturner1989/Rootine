import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DATE_PRESETS, EMPTY_DRAFT } from '../../src/components/journal/filter/config'
import { useFilterDraft } from '../../src/hooks/useFilterDraft'

describe('useFilterDraft', () => {
  it('starts from the filters it was given', () => {
    const initial = { plantIds: [1], kinds: ['water'], dateFrom: null, dateTo: null }
    const { result } = renderHook(() => useFilterDraft(initial))
    expect(result.current.draft).toEqual(initial)
  })

  it('toggles a plant on and back off', () => {
    const { result } = renderHook(() => useFilterDraft(EMPTY_DRAFT))

    act(() => result.current.togglePlant(4))
    expect(result.current.draft.plantIds).toEqual([4])

    act(() => result.current.togglePlant(4))
    expect(result.current.draft.plantIds).toEqual([])
  })

  it('toggles a kind on and back off', () => {
    const { result } = renderHook(() => useFilterDraft(EMPTY_DRAFT))

    act(() => result.current.toggleKind('photo'))
    expect(result.current.draft.kinds).toEqual(['photo'])

    act(() => result.current.toggleKind('photo'))
    expect(result.current.draft.kinds).toEqual([])
  })

  it('applying the all-time preset clears both date bounds', () => {
    const initial = { plantIds: [], kinds: [], dateFrom: '2026-01-01', dateTo: '2026-02-01' }
    const { result } = renderHook(() => useFilterDraft(initial))
    const allTime = DATE_PRESETS.find((preset) => preset.days == null)

    act(() => result.current.applyPreset(allTime))
    expect(result.current.draft.dateFrom).toBeNull()
    expect(result.current.draft.dateTo).toBeNull()
  })

  it('applying a day-bounded preset sets both bounds', () => {
    const { result } = renderHook(() => useFilterDraft(EMPTY_DRAFT))
    const lastSeven = DATE_PRESETS.find((preset) => preset.days === 7)

    act(() => result.current.applyPreset(lastSeven))
    expect(result.current.draft.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(result.current.draft.dateTo).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('normalises an empty date field to null', () => {
    const { result } = renderHook(() => useFilterDraft(EMPTY_DRAFT))

    act(() => result.current.setDateField('dateFrom', '2026-03-01'))
    expect(result.current.draft.dateFrom).toBe('2026-03-01')

    act(() => result.current.setDateField('dateFrom', ''))
    expect(result.current.draft.dateFrom).toBeNull()
  })

  it('reset returns the draft to empty', () => {
    const initial = { plantIds: [2], kinds: ['feed'], dateFrom: '2026-01-01', dateTo: null }
    const { result } = renderHook(() => useFilterDraft(initial))

    act(() => result.current.reset())
    expect(result.current.draft).toEqual(EMPTY_DRAFT)
  })
})
