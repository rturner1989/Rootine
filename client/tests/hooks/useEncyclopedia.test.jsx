import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { request } from '../../src/api/client'
import { useEncyclopediaBrowse, useEncyclopediaGrouped } from '../../src/hooks/useEncyclopedia'

vi.mock('../../src/api/client', () => ({ request: vi.fn() }))

function wrapper({ children }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

// speciesFacetsSchema requires pet_safe (a count), plus record maps for
// difficulty/light — empty objects satisfy the record shape, but pet_safe
// itself is a required number.
const EMPTY_FACETS = { pet_safe: 0, difficulty: {}, light: {} }

describe('useEncyclopediaBrowse', () => {
  afterEach(() => vi.mocked(request).mockReset())

  it('requests browse mode with no filters', async () => {
    vi.mocked(request).mockResolvedValue({ species: [], facets: EMPTY_FACETS })
    const { result } = renderHook(() => useEncyclopediaBrowse({}), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(request).toHaveBeenCalledWith('/api/v1/species?browse=1', expect.anything())
  })

  it('serialises active filters into the query string', async () => {
    vi.mocked(request).mockResolvedValue({ species: [], facets: EMPTY_FACETS })
    const { result } = renderHook(
      () => useEncyclopediaBrowse({ petSafe: true, difficulty: ['beginner', 'advanced'], light: ['bright'] }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const url = vi.mocked(request).mock.calls[0][0]
    expect(url).toContain('browse=1')
    expect(url).toContain('pet_safe=true')
    // difficulty is a multi axis — comma-joined (URLSearchParams encodes the comma)
    expect(decodeURIComponent(url)).toContain('difficulty=beginner,advanced')
    expect(url).toContain('light=bright')
  })

  it('omits filters that are not set', async () => {
    vi.mocked(request).mockResolvedValue({ species: [], facets: EMPTY_FACETS })
    const { result } = renderHook(() => useEncyclopediaBrowse({ petSafe: false, difficulty: [], light: [] }), {
      wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const url = vi.mocked(request).mock.calls[0][0]
    expect(url).not.toContain('pet_safe')
    expect(url).not.toContain('difficulty')
    expect(url).not.toContain('light')
  })
})

describe('useEncyclopediaGrouped', () => {
  afterEach(() => vi.mocked(request).mockReset())

  it('requests grouped browse with the group=spaces param', async () => {
    vi.mocked(request).mockResolvedValue({ groups: [] })
    const { result } = renderHook(() => useEncyclopediaGrouped({}), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const url = vi.mocked(request).mock.calls[0][0]
    expect(url).toContain('browse=1')
    expect(url).toContain('group=spaces')
  })

  it('threads filters into the grouped request', async () => {
    vi.mocked(request).mockResolvedValue({ groups: [] })
    const { result } = renderHook(
      () => useEncyclopediaGrouped({ petSafe: true, difficulty: ['beginner'], light: [] }),
      {
        wrapper,
      },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const url = vi.mocked(request).mock.calls[0][0]
    expect(url).toContain('pet_safe=true')
    expect(url).toContain('difficulty=beginner')
  })
})
