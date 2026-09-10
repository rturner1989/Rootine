import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { request } from '../../src/api/client'
import { isSearchQuery, useSpecies, useSpeciesSearch } from '../../src/hooks/useSpecies'
import { speciesIndexResultSchema, speciesSchema } from '../../src/types/species'

vi.mock('../../src/api/client', () => ({
  request: vi.fn(),
}))

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

// speciesSchema requires the full Species#as_json field set.
function speciesFixture(overrides = {}) {
  return {
    id: 1,
    common_name: 'Monstera',
    scientific_name: null,
    watering_frequency_days: 7,
    feeding_frequency_days: null,
    light_requirement: null,
    humidity_preference: null,
    temperature_min: null,
    temperature_max: null,
    toxicity: null,
    pet_safe: null,
    difficulty: null,
    growth_rate: null,
    personality: 'dramatic',
    popular: true,
    description: null,
    care_tips: null,
    image_url: null,
    suggested_light_level: 'medium',
    suggested_temperature_level: 'average',
    suggested_humidity_level: 'average',
    plant_levels: { light: ['low', 'medium', 'bright'], temperature: ['cool', 'average', 'warm'], humidity: ['dry', 'average', 'humid'] },
    ...overrides,
  }
}

describe('useSpeciesSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('branching queryFn', () => {
    it('hits the popular endpoint when query is empty', async () => {
      request.mockResolvedValue([speciesFixture({ id: 1, common_name: 'Monstera' })])
      const { result } = renderHook(() => useSpeciesSearch(''), { wrapper: makeWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(request).toHaveBeenCalledWith('/api/v1/species', z.array(speciesSchema))
    })

    it('hits the popular endpoint when query is 1 character (below search threshold)', async () => {
      request.mockResolvedValue([])
      const { result } = renderHook(() => useSpeciesSearch('m'), { wrapper: makeWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(request).toHaveBeenCalledWith('/api/v1/species', z.array(speciesSchema))
    })

    it('hits the search endpoint when query is 2+ characters', async () => {
      request.mockResolvedValue([speciesFixture({ id: 2, common_name: 'Monstera deliciosa' })])
      const { result } = renderHook(() => useSpeciesSearch('mon'), { wrapper: makeWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(request).toHaveBeenCalledWith('/api/v1/species?q=mon', z.array(speciesIndexResultSchema))
    })
  })

  // Without placeholderData: keepPreviousData the dropdown flashes empty on
  // every keystroke as the queryKey changes. This test locks in the no-flash
  // behaviour that the inline version in Step3Plants was designed around.
  describe('keepPreviousData', () => {
    it('keeps previous results visible while the next query is in flight', async () => {
      let resolveSecond
      const first = speciesFixture({ id: 1, common_name: 'Monstera' })
      const second = speciesFixture({ id: 2, common_name: 'Monstera deliciosa' })
      request.mockResolvedValueOnce([first]).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve
          }),
      )

      const { result, rerender } = renderHook(({ query }) => useSpeciesSearch(query), {
        wrapper: makeWrapper(),
        initialProps: { query: 'mon' },
      })

      await waitFor(() => expect(result.current.data).toEqual([first]))

      rerender({ query: 'mons' })

      // Second query is pending — previous data still exposed, flagged as placeholder
      expect(result.current.data).toEqual([first])
      expect(result.current.isPlaceholderData).toBe(true)

      resolveSecond([second])
      await waitFor(() => expect(result.current.data).toEqual([second]))
      expect(result.current.isPlaceholderData).toBe(false)
    })

    it('discards previous results when crossing from popular to search mode', async () => {
      let resolveSearch
      const popular = speciesFixture({ id: 1, common_name: 'Monstera' })
      const searched = speciesFixture({ id: 99, common_name: 'Rose' })
      request.mockResolvedValueOnce([popular]).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSearch = resolve
          }),
      )

      const { result, rerender } = renderHook(({ query }) => useSpeciesSearch(query), {
        wrapper: makeWrapper(),
        initialProps: { query: '' },
      })

      await waitFor(() => expect(result.current.data).toEqual([popular]))

      rerender({ query: 'ro' })

      expect(result.current.data).toBeUndefined()
      expect(result.current.isLoading).toBe(true)

      resolveSearch([searched])
      await waitFor(() => expect(result.current.data).toEqual([searched]))
    })
  })
})

describe('useSpecies', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches the species detail endpoint when enabled and id is present', async () => {
    request.mockResolvedValue(speciesFixture({ id: 42, common_name: 'Aloe' }))
    const { result } = renderHook(() => useSpecies(42), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(request).toHaveBeenCalledWith('/api/v1/species/42', speciesSchema)
  })

  it('skips the fetch when enabled is false (gates on view === species in Plant.jsx)', async () => {
    request.mockResolvedValue(speciesFixture({ id: 42, common_name: 'Aloe' }))
    const { result } = renderHook(() => useSpecies(42, { enabled: false }), { wrapper: makeWrapper() })

    expect(result.current.fetchStatus).toBe('idle')
    expect(request).not.toHaveBeenCalled()
  })

  it('skips the fetch when id is falsy', () => {
    renderHook(() => useSpecies(null), { wrapper: makeWrapper() })
    expect(request).not.toHaveBeenCalled()
  })

  it('fetches by perenual_id through the lookup endpoint, passing the fallback fields', async () => {
    request.mockResolvedValue(speciesFixture({ id: 99, common_name: 'orchid' }))
    const fallback = { common_name: 'orchid', scientific_name: "Calanthe 'Kozu Spice'", image_url: '' }
    const { result } = renderHook(() => useSpecies('lookup', { perenualId: 1468, fallback }), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const url = request.mock.calls[0][0]
    expect(url).toContain('/api/v1/species/lookup?')
    expect(url).toContain('perenual_id=1468')
    expect(decodeURIComponent(url)).toContain('common_name=orchid')
  })

  it('runs the perenual fetch even without a local id', async () => {
    request.mockResolvedValue(speciesFixture({ id: 99, common_name: 'orchid' }))
    renderHook(() => useSpecies(null, { perenualId: 1468, fallback: { common_name: '', scientific_name: '', image_url: '' } }), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(request).toHaveBeenCalled())
  })
})

describe('isSearchQuery', () => {
  it('treats strings of 2+ non-whitespace characters as search mode', () => {
    expect(isSearchQuery('ro')).toBe(true)
    expect(isSearchQuery('rose')).toBe(true)
  })

  it('treats whitespace-padded short input as not-search', () => {
    expect(isSearchQuery(' r ')).toBe(false)
    expect(isSearchQuery('  ')).toBe(false)
  })

  it('handles empty and non-string input without throwing', () => {
    expect(isSearchQuery('')).toBe(false)
    expect(isSearchQuery(undefined)).toBe(false)
    expect(isSearchQuery(null)).toBe(false)
  })
})
