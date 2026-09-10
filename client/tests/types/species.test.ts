import { z } from 'zod'
import { describe, expect, it } from 'vitest'
import { speciesBrowsePayloadSchema, speciesGroupedPayloadSchema, speciesIndexResultSchema } from '../../src/types/species'
import speciesBrowseFixture from '../fixtures/api/species-browse.json'
import speciesGroupedFixture from '../fixtures/api/species-grouped.json'
import speciesSearchFixture from '../fixtures/api/species-search.json'

describe('speciesBrowsePayloadSchema', () => {
  it('parses a real browse payload (catalogue-wide facets alongside a species subset)', () => {
    expect(speciesBrowsePayloadSchema.safeParse(speciesBrowseFixture).success).toBe(true)
  })

  it('rejects when facets.pet_safe is missing — Species.browse_facets always includes it', () => {
    const { pet_safe: _petSafe, ...facetsWithoutPetSafe } = speciesBrowseFixture.facets
    const broken = { ...speciesBrowseFixture, facets: facetsWithoutPetSafe }
    expect(speciesBrowsePayloadSchema.safeParse(broken).success).toBe(false)
  })
})

describe('speciesGroupedPayloadSchema', () => {
  it('parses a real grouped-by-space payload', () => {
    expect(speciesGroupedFixture.groups.length).toBeGreaterThan(0)
    expect(speciesGroupedPayloadSchema.safeParse(speciesGroupedFixture).success).toBe(true)
  })
})

// species-search.json is a real `?q=fern` response — it mixes a cached
// local Species row (id present, no `source`) with not-yet-cached Perenual
// results (id: null, source: 'perenual'), exactly as Species.search_with_api
// returns. Both union branches are exercised by the same fixture.
describe('speciesIndexResultSchema', () => {
  it('parses a real search response containing both union branches', () => {
    const hasLocalMatch = speciesSearchFixture.some((item) => item.id !== null)
    const hasPerenualMatch = speciesSearchFixture.some((item) => item.id === null && item.source === 'perenual')
    expect(hasLocalMatch).toBe(true)
    expect(hasPerenualMatch).toBe(true)
    expect(z.array(speciesIndexResultSchema).safeParse(speciesSearchFixture).success).toBe(true)
  })

  it('rejects a payload matching neither branch', () => {
    const neitherBranch = { id: 1, common_name: 'Not quite either shape' }
    expect(speciesIndexResultSchema.safeParse(neitherBranch).success).toBe(false)
  })
})
