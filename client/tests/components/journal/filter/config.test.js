import { describe, expect, it, vi } from 'vitest'
import { applyFilters, EMPTY_DRAFT, readJournalFilters } from '../../../../src/components/journal/filter/config'

// Characterisation tests: these pin the behaviour of the journal filter
// URL contract as it shipped, so the schema-driven rewrite can be proven
// identical rather than assumed identical. They must pass unchanged
// before and after the extraction.
describe('readJournalFilters', () => {
  it('reads every axis from the query string', () => {
    const params = new URLSearchParams('plant_ids=1,2&kinds=water,feed&date_from=2026-01-01&date_to=2026-02-01')
    expect(readJournalFilters(params)).toEqual({
      plantIds: [1, 2],
      kinds: ['water', 'feed'],
      dateFrom: '2026-01-01',
      dateTo: '2026-02-01',
    })
  })

  it('returns the empty draft shape when nothing is set', () => {
    expect(readJournalFilters(new URLSearchParams())).toEqual(EMPTY_DRAFT)
  })

  it('drops plant ids that are not positive finite numbers', () => {
    const params = new URLSearchParams('plant_ids=1,abc,-3,0,4')
    expect(readJournalFilters(params).plantIds).toEqual([1, 4])
  })

  it('drops kinds that are not in the known vocabulary', () => {
    const params = new URLSearchParams('kinds=water,bogus,photo')
    expect(readJournalFilters(params).kinds).toEqual(['water', 'photo'])
  })

  it('treats a missing date bound as null rather than undefined', () => {
    const params = new URLSearchParams('date_from=2026-01-01')
    const filters = readJournalFilters(params)
    expect(filters.dateFrom).toBe('2026-01-01')
    expect(filters.dateTo).toBeNull()
  })
})

describe('applyFilters', () => {
  // applyFilters hands React Router an updater function; capture it and
  // run it against a known starting query string to see the result.
  function commit(draft, startingQuery = '') {
    const setSearchParams = vi.fn()
    applyFilters(setSearchParams, draft)
    const [updater, options] = setSearchParams.mock.calls[0]
    return { params: updater(new URLSearchParams(startingQuery)), options }
  }

  it('writes every populated axis to the query string', () => {
    const { params } = commit({
      plantIds: [3, 7],
      kinds: ['photo'],
      dateFrom: '2026-01-01',
      dateTo: '2026-02-01',
    })
    expect(params.get('plant_ids')).toBe('3,7')
    expect(params.get('kinds')).toBe('photo')
    expect(params.get('date_from')).toBe('2026-01-01')
    expect(params.get('date_to')).toBe('2026-02-01')
  })

  it('deletes params for empty axes instead of writing blanks', () => {
    const { params } = commit(EMPTY_DRAFT, 'plant_ids=1&kinds=water&date_from=2026-01-01&date_to=2026-02-01')
    expect(params.get('plant_ids')).toBeNull()
    expect(params.get('kinds')).toBeNull()
    expect(params.get('date_from')).toBeNull()
    expect(params.get('date_to')).toBeNull()
  })

  it('preserves unrelated query params', () => {
    const { params } = commit(EMPTY_DRAFT, 'tab=photos&view=month')
    expect(params.get('tab')).toBe('photos')
    expect(params.get('view')).toBe('month')
  })

  it('pushes a history entry rather than replacing', () => {
    const { options } = commit(EMPTY_DRAFT)
    expect(options).toEqual({ replace: false })
  })
})
