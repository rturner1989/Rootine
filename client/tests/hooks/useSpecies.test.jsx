import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiGet } from '../../src/api/client'
import { isSearchQuery, useSpecies, useSpeciesSearch } from '../../src/hooks/useSpecies'

vi.mock('../../src/api/client', () => ({
  apiGet: vi.fn(),
}))

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useSpeciesSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('branching queryFn', () => {
    it('hits the popular endpoint when query is empty', async () => {
      apiGet.mockResolvedValue([{ id: 1, common_name: 'Monstera' }])
      const { result } = renderHook(() => useSpeciesSearch(''), { wrapper: makeWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(apiGet).toHaveBeenCalledWith('/api/v1/species')
    })

    it('hits the popular endpoint when query is 1 character (below search threshold)', async () => {
      apiGet.mockResolvedValue([])
      const { result } = renderHook(() => useSpeciesSearch('m'), { wrapper: makeWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(apiGet).toHaveBeenCalledWith('/api/v1/species')
    })

    it('hits the search endpoint when query is 2+ characters', async () => {
      apiGet.mockResolvedValue([{ id: 2, common_name: 'Monstera deliciosa' }])
      const { result } = renderHook(() => useSpeciesSearch('mon'), { wrapper: makeWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(apiGet).toHaveBeenCalledWith('/api/v1/species?q=mon')
    })
  })

  // Without placeholderData: keepPreviousData the dropdown flashes empty on
  // every keystroke as the queryKey changes. This test locks in the no-flash
  // behaviour that the inline version in Step3Plants was designed around.
  describe('keepPreviousData', () => {
    it('keeps previous results visible while the next query is in flight', async () => {
      let resolveSecond
      apiGet.mockResolvedValueOnce([{ id: 1, common_name: 'Monstera' }]).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve
          }),
      )

      const { result, rerender } = renderHook(({ query }) => useSpeciesSearch(query), {
        wrapper: makeWrapper(),
        initialProps: { query: 'mon' },
      })

      await waitFor(() => expect(result.current.data).toEqual([{ id: 1, common_name: 'Monstera' }]))

      rerender({ query: 'mons' })

      // Second query is pending — previous data still exposed, flagged as placeholder
      expect(result.current.data).toEqual([{ id: 1, common_name: 'Monstera' }])
      expect(result.current.isPlaceholderData).toBe(true)

      resolveSecond([{ id: 2, common_name: 'Monstera deliciosa' }])
      await waitFor(() => expect(result.current.data).toEqual([{ id: 2, common_name: 'Monstera deliciosa' }]))
      expect(result.current.isPlaceholderData).toBe(false)
    })

    it('discards previous results when crossing from popular to search mode', async () => {
      let resolveSearch
      apiGet.mockResolvedValueOnce([{ id: 1, common_name: 'Monstera' }]).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSearch = resolve
          }),
      )

      const { result, rerender } = renderHook(({ query }) => useSpeciesSearch(query), {
        wrapper: makeWrapper(),
        initialProps: { query: '' },
      })

      await waitFor(() => expect(result.current.data).toEqual([{ id: 1, common_name: 'Monstera' }]))

      rerender({ query: 'ro' })

      expect(result.current.data).toBeUndefined()
      expect(result.current.isLoading).toBe(true)

      resolveSearch([{ id: 99, common_name: 'Rose' }])
      await waitFor(() => expect(result.current.data).toEqual([{ id: 99, common_name: 'Rose' }]))
    })
  })
})

describe('useSpecies', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches the species detail endpoint when enabled and id is present', async () => {
    apiGet.mockResolvedValue({ id: 42, common_name: 'Aloe' })
    const { result } = renderHook(() => useSpecies(42), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiGet).toHaveBeenCalledWith('/api/v1/species/42')
  })

  it('skips the fetch when enabled is false (gates on view === species in Plant.jsx)', async () => {
    apiGet.mockResolvedValue({ id: 42, common_name: 'Aloe' })
    const { result } = renderHook(() => useSpecies(42, { enabled: false }), { wrapper: makeWrapper() })

    expect(result.current.fetchStatus).toBe('idle')
    expect(apiGet).not.toHaveBeenCalled()
  })

  it('skips the fetch when id is falsy', () => {
    renderHook(() => useSpecies(null), { wrapper: makeWrapper() })
    expect(apiGet).not.toHaveBeenCalled()
  })

  it('fetches by perenual_id through the lookup endpoint, passing the fallback fields', async () => {
    apiGet.mockResolvedValue({ id: 99, common_name: 'orchid' })
    const fallback = { common_name: 'orchid', scientific_name: "Calanthe 'Kozu Spice'", image_url: '' }
    const { result } = renderHook(() => useSpecies('lookup', { perenualId: 1468, fallback }), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const url = apiGet.mock.calls[0][0]
    expect(url).toContain('/api/v1/species/lookup?')
    expect(url).toContain('perenual_id=1468')
    expect(decodeURIComponent(url)).toContain('common_name=orchid')
  })

  it('runs the perenual fetch even without a local id', async () => {
    apiGet.mockResolvedValue({ id: 99, common_name: 'orchid' })
    renderHook(() => useSpecies(null, { perenualId: 1468, fallback: {} }), { wrapper: makeWrapper() })

    await waitFor(() => expect(apiGet).toHaveBeenCalled())
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
