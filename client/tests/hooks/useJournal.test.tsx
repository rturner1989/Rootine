import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from '../../src/api/client'
import { normalizeJournalFilters, useJournal } from '../../src/hooks/useJournal'
import type { JournalCalendarSummary, JournalIndexResponse } from '../../src/types/journal'

// useJournal only reads `request` from api/client — setAccessToken/getAccessToken
// are irrelevant to journal fetching, so the mock omits them.
vi.mock('../../src/api/client', () => ({
  request: vi.fn(),
}))

const mockedRequest = vi.mocked(request)

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function lastRequestedUrl(): string {
  return (mockedRequest.mock.calls.at(-1)?.[0] as string) ?? ''
}

// journalCalendarSummarySchema requires every field — whole-set totals the
// server always ships alongside entries, even on an empty page.
const EMPTY_SUMMARY = {
  entry_count: 0,
  plant_count: 0,
  kind_counts: { water: 0, feed: 0, photo: 0, achievement: 0, acquisition: 0 },
  top_plants: [],
  streak: { days: 0 },
} satisfies JournalCalendarSummary

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
    mockedRequest.mockResolvedValue({ entries: [], next_cursor: null, summary: EMPTY_SUMMARY } satisfies JournalIndexResponse)
    const { result } = renderHook(() => useJournal(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(lastRequestedUrl()).toContain('/api/v1/journal?')
    expect(lastRequestedUrl()).toContain('limit=30')
  })

  it('encodes filters in the query string', async () => {
    mockedRequest.mockResolvedValue({ entries: [], next_cursor: null, summary: EMPTY_SUMMARY } satisfies JournalIndexResponse)
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
    mockedRequest
      .mockResolvedValueOnce({
        entries: [{ id: 'water-1', kind: 'water', occurred_at: '2026-05-10T12:00:00.000Z', plant: null, notes: null }],
        next_cursor: '2026-05-10T12:00:00.000Z',
        summary: EMPTY_SUMMARY,
      } satisfies JournalIndexResponse)
      .mockResolvedValueOnce({ entries: [], next_cursor: null, summary: EMPTY_SUMMARY } satisfies JournalIndexResponse)

    const { result } = renderHook(() => useJournal({ limit: 1 }), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    result.current.fetchNextPage()

    await waitFor(() => expect(mockedRequest).toHaveBeenCalledTimes(2))
    expect(lastRequestedUrl()).toContain('before=2026-05-10T12%3A00%3A00.000Z')
  })

  it('exposes hasNextPage=false when the server returns a null cursor', async () => {
    mockedRequest.mockResolvedValue({ entries: [], next_cursor: null, summary: EMPTY_SUMMARY } satisfies JournalIndexResponse)

    const { result } = renderHook(() => useJournal(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.hasNextPage).toBe(false)
  })
})
