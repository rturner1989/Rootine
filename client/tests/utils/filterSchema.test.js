import { describe, expect, it } from 'vitest'
import { countActive, emptyDraft, readFilters, writeFilters } from '../../src/utils/filterSchema'

const SCHEMA = [
  { id: 'plantIds', param: 'plant_ids', type: 'multi', cast: 'number', isValid: (id) => id > 0 },
  { id: 'kinds', param: 'kinds', type: 'multi', isValid: (kind) => ['water', 'feed'].includes(kind) },
  { id: 'petSafe', param: 'pet_safe', type: 'bool' },
  { id: 'date', type: 'range', fromKey: 'dateFrom', toKey: 'dateTo', fromParam: 'date_from', toParam: 'date_to' },
]

describe('emptyDraft', () => {
  it('gives multi axes an array and every other key null', () => {
    expect(emptyDraft(SCHEMA)).toEqual({
      plantIds: [],
      kinds: [],
      petSafe: null,
      dateFrom: null,
      dateTo: null,
    })
  })
})

describe('readFilters', () => {
  it('reads each axis type into a flat object', () => {
    const params = new URLSearchParams('plant_ids=1,2&kinds=water&pet_safe=true&date_from=2026-01-01')
    expect(readFilters(params, SCHEMA)).toEqual({
      plantIds: [1, 2],
      kinds: ['water'],
      petSafe: true,
      dateFrom: '2026-01-01',
      dateTo: null,
    })
  })

  it('casts and validates multi values, dropping the rest', () => {
    const params = new URLSearchParams('plant_ids=1,abc,-3,0,4&kinds=water,bogus')
    const filters = readFilters(params, SCHEMA)
    expect(filters.plantIds).toEqual([1, 4])
    expect(filters.kinds).toEqual(['water'])
  })

  it('reads pet_safe=false as false, not as absent', () => {
    const params = new URLSearchParams('pet_safe=false')
    expect(readFilters(params, SCHEMA).petSafe).toBe(false)
  })

  it('returns the empty draft when nothing is set', () => {
    expect(readFilters(new URLSearchParams(), SCHEMA)).toEqual(emptyDraft(SCHEMA))
  })
})

describe('writeFilters', () => {
  it('writes populated axes and deletes empty ones', () => {
    const starting = new URLSearchParams('plant_ids=9&kinds=feed&pet_safe=true&date_from=2020-01-01')
    const params = writeFilters(starting, emptyDraft(SCHEMA), SCHEMA)
    expect(params.get('plant_ids')).toBeNull()
    expect(params.get('kinds')).toBeNull()
    expect(params.get('pet_safe')).toBeNull()
    expect(params.get('date_from')).toBeNull()
  })

  it('round-trips a populated draft', () => {
    const draft = { plantIds: [3, 7], kinds: ['feed'], petSafe: true, dateFrom: '2026-01-01', dateTo: '2026-02-01' }
    const params = writeFilters(new URLSearchParams(), draft, SCHEMA)
    expect(readFilters(params, SCHEMA)).toEqual(draft)
  })

  it('writes pet_safe=false rather than dropping it', () => {
    const draft = { ...emptyDraft(SCHEMA), petSafe: false }
    const params = writeFilters(new URLSearchParams(), draft, SCHEMA)
    expect(params.get('pet_safe')).toBe('false')
  })

  it('leaves unrelated params untouched', () => {
    const params = writeFilters(new URLSearchParams('tab=photos'), emptyDraft(SCHEMA), SCHEMA)
    expect(params.get('tab')).toBe('photos')
  })
})

describe('countActive', () => {
  it('counts each populated multi axis by its length', () => {
    const draft = { ...emptyDraft(SCHEMA), plantIds: [1, 2], kinds: ['water'] }
    expect(countActive(draft, SCHEMA)).toBe(3)
  })

  it('counts a set bool as one, including false', () => {
    expect(countActive({ ...emptyDraft(SCHEMA), petSafe: false }, SCHEMA)).toBe(1)
  })

  it('counts a range as one regardless of how many bounds are set', () => {
    const oneBound = { ...emptyDraft(SCHEMA), dateFrom: '2026-01-01' }
    const bothBounds = { ...emptyDraft(SCHEMA), dateFrom: '2026-01-01', dateTo: '2026-02-01' }
    expect(countActive(oneBound, SCHEMA)).toBe(1)
    expect(countActive(bothBounds, SCHEMA)).toBe(1)
  })

  it('ignores hidden axes', () => {
    const draft = { ...emptyDraft(SCHEMA), plantIds: [1, 2], kinds: ['water'] }
    expect(countActive(draft, SCHEMA, ['plantIds'])).toBe(1)
  })

  it('counts an empty draft as zero', () => {
    expect(countActive(emptyDraft(SCHEMA), SCHEMA)).toBe(0)
  })
})
