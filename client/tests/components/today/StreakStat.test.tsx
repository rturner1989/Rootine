import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type * as ApiClientModule from '../../../src/api/client'
import { request } from '../../../src/api/client'
import StreakStat from '../../../src/components/today/StreakStat'
import type { DashboardResponse } from '../../../src/types/dashboard'

// StreakStat's dependency tree (useDashboard) only calls `request`.
vi.mock(
  '../../../src/api/client',
  (): Pick<typeof ApiClientModule, 'request'> => ({
    request: vi.fn(),
  }),
)

function dashboardFixture(overrides: Partial<DashboardResponse> = {}): DashboardResponse {
  return {
    plants_needing_water: [],
    plants_needing_feeding: [],
    upcoming_care: [],
    tasks: [],
    tasks_by_day: {},
    streak: { current: 0, longest: 0, care_current: 0, care_longest: 0 },
    stats: { total_plants: 0, total_spaces: 0, vitality_percent: 0 },
    ...overrides,
  }
}

function renderWidget() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <StreakStat />
    </QueryClientProvider>,
  )
}

describe('StreakStat', () => {
  afterEach(() => vi.mocked(request).mockReset())

  it('renders the current streak from the dashboard response', async () => {
    vi.mocked(request).mockResolvedValue(
      dashboardFixture({ streak: { current: 5, longest: 5, care_current: 5, care_longest: 5 } }),
    )

    renderWidget()
    expect(await screen.findByText('5')).toBeInTheDocument()
    expect(screen.getByText('Day streak')).toBeInTheDocument()
  })

  it('shows a retry affordance instead of a streak of 0 when the dashboard request fails', async () => {
    vi.mocked(request).mockRejectedValue(new Error('boom'))

    renderWidget()
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    // A failed request must not read as "streak reset to zero".
    expect(screen.queryByText('0')).not.toBeInTheDocument()
    expect(screen.queryByText('Day streak')).not.toBeInTheDocument()
  })

  it('retries the dashboard query when the retry control is activated', async () => {
    const user = userEvent.setup()
    vi.mocked(request).mockRejectedValue(new Error('boom'))

    renderWidget()
    await screen.findByRole('alert')
    vi.mocked(request).mockResolvedValue(
      dashboardFixture({ streak: { current: 3, longest: 5, care_current: 3, care_longest: 5 } }),
    )

    await user.click(screen.getByRole('button', { name: /retry/i }))
    expect(await screen.findByText('3')).toBeInTheDocument()
  })
})
