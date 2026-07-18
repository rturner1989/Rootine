import { describe, expect, it } from 'vitest'
import { queryKeys } from '../../src/api/queryKeys'

// These assert the literal arrays the hooks used before the registry
// existed. A key that changes shape doesn't throw — the query still
// runs and the invalidation quietly stops matching — so the exact
// values are pinned here rather than left to review.
describe('queryKeys', () => {
  it('single-key resources', () => {
    expect(queryKeys.profile).toEqual(['profile'])
    expect(queryKeys.weather).toEqual(['weather'])
    expect(queryKeys.notifications).toEqual(['notifications'])
  })

  it('dashboard', () => {
    expect(queryKeys.dashboard.all).toEqual(['dashboard'])
    expect(queryKeys.dashboard.forDate('2026-07-17')).toEqual(['dashboard', '2026-07-17'])
    // Today passes no date and must land on the same key as `all`.
    expect(queryKeys.dashboard.forDate(null)).toEqual(['dashboard'])
    expect(queryKeys.dashboard.forDate(undefined)).toEqual(['dashboard'])
  })

  it('plants', () => {
    expect(queryKeys.plants.all).toEqual(['plants'])
    expect(queryKeys.plants.detail(7)).toEqual(['plants', 7])
    expect(queryKeys.plants.careLogs(7, 'watering')).toEqual(['plants', 7, 'careLogs', 'watering'])
    expect(queryKeys.plants.careLogs(7, undefined)).toEqual(['plants', 7, 'careLogs', undefined])
  })

  it('spaces', () => {
    expect(queryKeys.spaces.all).toEqual(['spaces'])
    expect(queryKeys.spaces.list('indoor')).toEqual(['spaces', 'indoor'])
    expect(queryKeys.spaces.detail(3)).toEqual(['spaces', 3])
    expect(queryKeys.spaces.presets).toEqual(['spaces', 'presets'])
  })

  it('species', () => {
    expect(queryKeys.species.popular).toEqual(['species', 'popular'])
    expect(queryKeys.species.search('fern')).toEqual(['species', 'search', 'fern'])
    expect(queryKeys.species.detail(12)).toEqual(['species', 12])
  })

  // useSpecies decides whether to reuse placeholder data by reading
  // queryKey[1], so 'search' has to stay in that slot.
  it('keeps the species discriminator at index 1', () => {
    expect(queryKeys.species.search('fern')[1]).toBe('search')
    expect(queryKeys.species.popular[1]).toBe('popular')
  })

  it('journal', () => {
    const filters = { plantIds: [1] }
    expect(queryKeys.journal.all).toEqual(['journal'])
    expect(queryKeys.journal.list(filters)).toEqual(['journal', filters])
    expect(queryKeys.journal.calendar('2026-07-01', '2026-07-31', filters)).toEqual([
      'journal',
      'calendar',
      '2026-07-01',
      '2026-07-31',
      filters,
    ])
  })

  it('photos', () => {
    const filters = { plantIds: [1] }
    expect(queryKeys.photos.all).toEqual(['photos'])
    expect(queryKeys.photos.list(filters)).toEqual(['photos', filters])
  })

  it('achievements', () => {
    expect(queryKeys.achievements.all).toEqual(['achievements'])
    expect(queryKeys.achievements.unseen).toEqual(['achievements', 'unseen'])
  })

  // Invalidating a resource's `all` must prefix-match its variants, or a
  // mutation that means to clear the resource clears nothing.
  it('every variant starts with its resource prefix', () => {
    expect(queryKeys.plants.detail(1)[0]).toBe(queryKeys.plants.all[0])
    expect(queryKeys.plants.careLogs(1, 'watering')[0]).toBe(queryKeys.plants.all[0])
    expect(queryKeys.spaces.detail(1)[0]).toBe(queryKeys.spaces.all[0])
    expect(queryKeys.spaces.presets[0]).toBe(queryKeys.spaces.all[0])
    expect(queryKeys.journal.calendar('a', 'b', {})[0]).toBe(queryKeys.journal.all[0])
    expect(queryKeys.photos.list({})[0]).toBe(queryKeys.photos.all[0])
    expect(queryKeys.achievements.unseen[0]).toBe(queryKeys.achievements.all[0])
  })
})
