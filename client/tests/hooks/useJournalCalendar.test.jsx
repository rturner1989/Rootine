import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiGet } from '../../src/api/client'
import { useJournalCalendar } from '../../src/hooks/useJournalCalendar'

vi.mock('../../src/api/client', () => ({ apiGet: vi.fn() }))

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

const lastUrl = () => apiGet.mock.calls.at(-1)?.[0] ?? ''

describe('useJournalCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requests the given window', async () => {
    apiGet.mockResolvedValue({ events: [], scheduled: [] })
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
    apiGet.mockResolvedValue({ events: [], scheduled: [] })
    const { result } = renderHook(
      () => useJournalCalendar({ from: '2025-09-01', to: '2025-09-07' }, { plantIds: [42], kinds: ['water'] }),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(lastUrl()).toContain('plant_ids=42')
    expect(lastUrl()).toContain('kinds=water')
  })

  it('keys each window to itself so paging refetches', async () => {
    apiGet.mockResolvedValue({ events: [], scheduled: [] })
    const { result, rerender } = renderHook(({ range }) => useJournalCalendar(range), {
      wrapper: makeWrapper(),
      initialProps: { range: { from: '2025-09-01', to: '2025-10-12' } },
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    rerender({ range: { from: '2025-09-29', to: '2025-11-09' } })
    await waitFor(() => expect(apiGet).toHaveBeenCalledTimes(2))
    expect(lastUrl()).toContain('date_from=2025-09-29')
  })
})
