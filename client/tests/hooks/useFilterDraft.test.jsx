import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DATE_PRESETS, EMPTY_DRAFT, JOURNAL_FILTER_SCHEMA, presetRange } from '../../src/components/journal/filter/config'
import { useFilterDraft } from '../../src/hooks/useFilterDraft'

describe('useFilterDraft', () => {
  it('starts from the filters it was given', () => {
    const initial = { plantIds: [1], kinds: ['water'], dateFrom: null, dateTo: null }
    const { result } = renderHook(() => useFilterDraft(initial, JOURNAL_FILTER_SCHEMA))
    expect(result.current.draft).toEqual(initial)
  })

  it('toggles a plant on and back off', () => {
    const { result } = renderHook(() => useFilterDraft(EMPTY_DRAFT, JOURNAL_FILTER_SCHEMA))

    act(() => result.current.toggleValue('plantIds', 4))
    expect(result.current.draft.plantIds).toEqual([4])

    act(() => result.current.toggleValue('plantIds', 4))
    expect(result.current.draft.plantIds).toEqual([])
  })

  it('toggles a kind on and back off', () => {
    const { result } = renderHook(() => useFilterDraft(EMPTY_DRAFT, JOURNAL_FILTER_SCHEMA))

    act(() => result.current.toggleValue('kinds', 'photo'))
    expect(result.current.draft.kinds).toEqual(['photo'])

    act(() => result.current.toggleValue('kinds', 'photo'))
    expect(result.current.draft.kinds).toEqual([])
  })

  it('applying a date preset sets both bounds through setValue', () => {
    const { result } = renderHook(() => useFilterDraft(EMPTY_DRAFT, JOURNAL_FILTER_SCHEMA))
    const range = presetRange(DATE_PRESETS.find((preset) => preset.days === 7))

    act(() => {
      result.current.setValue('dateFrom', range.dateFrom)
      result.current.setValue('dateTo', range.dateTo)
    })
    expect(result.current.draft.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(result.current.draft.dateTo).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('normalises an empty date field to null', () => {
    const { result } = renderHook(() => useFilterDraft(EMPTY_DRAFT, JOURNAL_FILTER_SCHEMA))

    act(() => result.current.setValue('dateFrom', '2026-03-01'))
    expect(result.current.draft.dateFrom).toBe('2026-03-01')

    act(() => result.current.setValue('dateFrom', ''))
    expect(result.current.draft.dateFrom).toBeNull()
  })

  it('reset returns the draft to empty', () => {
    const initial = { plantIds: [2], kinds: ['feed'], dateFrom: '2026-01-01', dateTo: null }
    const { result } = renderHook(() => useFilterDraft(initial, JOURNAL_FILTER_SCHEMA))

    act(() => result.current.reset())
    expect(result.current.draft).toEqual(EMPTY_DRAFT)
  })
})
