import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiGet } from '../../src/api/client'
import { normalizeJournalFilters, useJournal } from '../../src/hooks/useJournal'

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

function lastRequestedUrl() {
  return apiGet.mock.calls.at(-1)?.[0] ?? ''
}

describe('normalizeJournalFilters', () => {
  it('fills defaults for absent fields and sorts kinds + plantIds canonically', () => {
    const normalized = normalizeJournalFilters({ kinds: ['photo', 'feed', 'water'], plantIds: [42, 7, 19] })
    expect(normalized).toEqual({
      plantIds: [7, 19, 42],
      kinds: ['feed', 'photo', 'water'],
      dateFrom: null,
      dateTo: null,
      limit: 30,
    })
  })

  it('treats empty arrays as no filter', () => {
    expect(normalizeJournalFilters({ kinds: [], plantIds: [] }).kinds).toBeNull()
    expect(normalizeJournalFilters({ plantIds: [] }).plantIds).toBeNull()
  })
})

describe('useJournal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches /api/v1/journal with the default limit on first page', async () => {
    apiGet.mockResolvedValue({ entries: [], next_cursor: null })
    const { result } = renderHook(() => useJournal(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(lastRequestedUrl()).toContain('/api/v1/journal?')
    expect(lastRequestedUrl()).toContain('limit=30')
  })

  it('encodes filters in the query string', async () => {
    apiGet.mockResolvedValue({ entries: [], next_cursor: null })
    const { result } = renderHook(
      () =>
        useJournal({
          plantIds: [42, 7],
          kinds: ['water', 'photo'],
          dateFrom: '2026-04-01',
          dateTo: '2026-04-30',
        }),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const url = lastRequestedUrl()
    expect(url).toContain('plant_ids=7%2C42')
    expect(url).toContain('kinds=photo%2Cwater')
    expect(url).toContain('date_from=2026-04-01')
    expect(url).toContain('date_to=2026-04-30')
  })

  it('passes the next_cursor as `before` when fetchNextPage is called', async () => {
    apiGet
      .mockResolvedValueOnce({
        entries: [{ id: 'water-1', occurred_at: '2026-05-10T12:00:00.000Z' }],
        next_cursor: '2026-05-10T12:00:00.000Z',
      })
      .mockResolvedValueOnce({ entries: [], next_cursor: null })

    const { result } = renderHook(() => useJournal({ limit: 1 }), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    result.current.fetchNextPage()

    await waitFor(() => expect(apiGet).toHaveBeenCalledTimes(2))
    expect(lastRequestedUrl()).toContain('before=2026-05-10T12%3A00%3A00.000Z')
  })

  it('exposes hasNextPage=false when the server returns a null cursor', async () => {
    apiGet.mockResolvedValue({ entries: [], next_cursor: null })

    const { result } = renderHook(() => useJournal(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.hasNextPage).toBe(false)
  })
})
