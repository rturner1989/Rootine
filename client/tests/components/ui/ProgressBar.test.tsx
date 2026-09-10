import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import ProgressBar from '../../../src/components/ui/ProgressBar'

function renderWithClient(
  ui: ReactElement,
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

function Probe({ fetcher }: { fetcher: () => Promise<unknown> }) {
  useQuery({ queryKey: ['probe'], queryFn: fetcher })
  return null
}

describe('ProgressBar', () => {
  it('renders nothing when nothing is fetching', () => {
    renderWithClient(<ProgressBar />)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('shows the bar while a slow fetch is in flight (past the debounce)', async () => {
    const slow = () => new Promise(() => {})
    renderWithClient(
      <>
        <Probe fetcher={slow} />
        <ProgressBar />
      </>,
    )

    await waitFor(() => expect(screen.getByRole('progressbar')).toBeInTheDocument(), { timeout: 500 })
  })

  it('stays hidden when all fetches finish before the 120ms show-debounce', async () => {
    const fast = () => Promise.resolve('ok')
    renderWithClient(
      <>
        <Probe fetcher={fast} />
        <ProgressBar />
      </>,
    )

    // Give React + TanStack Query a few ticks to settle the fast query.
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })
})
