import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { request } from '../../../src/api/client'
import AchievementsWidget from '../../../src/components/organiser/AchievementsWidget'

vi.mock('../../../src/api/client', () => ({ request: vi.fn() }))

function renderWidget() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AchievementsWidget />
    </QueryClientProvider>,
  )
}

describe('AchievementsWidget', () => {
  afterEach(() => vi.mocked(request).mockReset())

  it('renders earned achievements from the response', async () => {
    vi.mocked(request).mockResolvedValue({
      achievements: [{ id: 1, kind: 'streak_7', label: 'One week strong', emoji: '🔥', earned_at: '2026-01-01' }],
    })

    renderWidget()
    expect(await screen.findByText('One week strong')).toBeInTheDocument()
  })

  it('shows an error state instead of an empty state when the request fails', async () => {
    vi.mocked(request).mockRejectedValue(new Error('boom'))

    renderWidget()
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't load your achievements/i)
    // A failed request must not be mistaken for "no achievements yet".
    expect(screen.queryByText(/no achievements yet/i)).not.toBeInTheDocument()
  })
})
