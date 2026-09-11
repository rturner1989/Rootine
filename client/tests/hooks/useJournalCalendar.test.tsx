import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from '../../src/api/client'
import { useJournalCalendar } from '../../src/hooks/useJournalCalendar'
import type { JournalCalendarResponse, JournalCalendarSummary } from '../../src/types/journal'

// useJournalCalendar only reads `request` — the mock omits setAccessToken/getAccessToken.
vi.mock('../../src/api/client', () => ({ request: vi.fn() }))

const mockedRequest = vi.mocked(request)

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

const lastUrl = (): string => (mockedRequest.mock.calls.at(-1)?.[0] as string) ?? ''

// journalCalendarResponseSchema requires a summary envelope alongside
// events/scheduled — same shape JournalStream#summary always ships.
const EMPTY_SUMMARY = {
  entry_count: 0,
  plant_count: 0,
  kind_counts: { water: 0, feed: 0, photo: 0, achievement: 0, acquisition: 0 },
  top_plants: [],
  streak: { days: 0 },
} satisfies JournalCalendarSummary

describe('useJournalCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requests the given window', async () => {
    mockedRequest.mockResolvedValue({
      events: [],
      scheduled: [],
      summary: EMPTY_SUMMARY,
    } satisfies JournalCalendarResponse)
    const { result } = renderHook(() => useJournalCalendar({ from: '2025-09-01', to: '2025-10-12' }), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(lastUrl()).toContain('/api/v1/journal/calendar?')
    expect(lastUrl()).toContain('date_from=2025-09-01')
    expect(lastUrl()).toContain('date_to=2025-10-12')
    expect(lastUrl()).not.toContain('plant_ids')
    expect(lastUrl()).not.toContain('kinds')
  })

  it('passes the plant and kind filters through', async () => {
    mockedRequest.mockResolvedValue({
      events: [],
      scheduled: [],
      summary: EMPTY_SUMMARY,
    } satisfies JournalCalendarResponse)
    const { result } = renderHook(
      () => useJournalCalendar({ from: '2025-09-01', to: '2025-09-07' }, { plantIds: [42], kinds: ['water'] }),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(lastUrl()).toContain('plant_ids=42')
    expect(lastUrl()).toContain('kinds=water')
  })

  it('keys each window to itself so paging refetches', async () => {
    mockedRequest.mockResolvedValue({
      events: [],
      scheduled: [],
      summary: EMPTY_SUMMARY,
    } satisfies JournalCalendarResponse)
    const { result, rerender } = renderHook(({ range }) => useJournalCalendar(range), {
      wrapper: makeWrapper(),
      initialProps: { range: { from: '2025-09-01', to: '2025-10-12' } },
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    rerender({ range: { from: '2025-09-29', to: '2025-11-09' } })
    await waitFor(() => expect(mockedRequest).toHaveBeenCalledTimes(2))
    expect(lastUrl()).toContain('date_from=2025-09-29')
  })
})
