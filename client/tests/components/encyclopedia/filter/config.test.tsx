import { describe, expect, it, vi } from 'vitest'
import {
  applyEncyclopediaFilters,
  DIFFICULTY_OPTIONS,
  LIGHT_OPTIONS,
  readEncyclopediaFilters,
} from '../../../../src/components/encyclopedia/filter/config'

describe('readEncyclopediaFilters', () => {
  it('reads pet_safe, difficulty, light from the query string', () => {
    const params = new URLSearchParams('pet_safe=true&difficulty=beginner,intermediate&light=bright')
    expect(readEncyclopediaFilters(params)).toEqual({
      petSafe: true,
      difficulty: ['beginner', 'intermediate'],
      light: ['bright'],
    })
  })

  it('empties to the neutral draft when nothing is set', () => {
    expect(readEncyclopediaFilters(new URLSearchParams())).toEqual({
      petSafe: null,
      difficulty: [],
      light: [],
    })
  })

  it('drops difficulty values outside the known set', () => {
    const params = new URLSearchParams('difficulty=beginner,wizard')
    expect(readEncyclopediaFilters(params).difficulty).toEqual(['beginner'])
  })
})

describe('applyEncyclopediaFilters', () => {
  it('writes populated axes and deletes empty ones', () => {
    const setSearchParams = vi.fn()
    applyEncyclopediaFilters(setSearchParams, { petSafe: true, difficulty: ['beginner'], light: [] })
    const [updater] = setSearchParams.mock.calls[0]
    const params = updater(new URLSearchParams('light=bright'))
    expect(params.get('pet_safe')).toBe('true')
    expect(params.get('difficulty')).toBe('beginner')
    expect(params.get('light')).toBeNull()
  })
})

describe('option lists', () => {
  it('exposes the three difficulty levels and three light levels', () => {
    expect(DIFFICULTY_OPTIONS.map((option) => option.value)).toEqual(['beginner', 'intermediate', 'advanced'])
    expect(LIGHT_OPTIONS.map((option) => option.value)).toEqual(['low', 'medium', 'bright'])
  })
})
