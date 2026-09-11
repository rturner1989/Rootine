import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type * as ApiClientModule from '../../../src/api/client'
import { request } from '../../../src/api/client'
import WeatherWidget from '../../../src/components/today/WeatherWidget'

// WeatherWidget's dependency tree only calls `request` — every test here
// exercises the rejected-request path, so no mockResolvedValue shape to verify.
vi.mock(
  '../../../src/api/client',
  (): Pick<typeof ApiClientModule, 'request'> => ({
    request: vi.fn(),
  }),
)

function renderWidget(props = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <WeatherWidget {...props} />
    </QueryClientProvider>,
  )
}

describe('WeatherWidget', () => {
  afterEach(() => vi.mocked(request).mockReset())

  it('card variant shows an error state instead of the loading placeholder when the request fails', async () => {
    vi.mocked(request).mockRejectedValue(new Error('boom'))

    renderWidget()
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't load the weather/i)
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
  })

  it('strip variant shows an error state instead of the loading placeholder when the request fails', async () => {
    vi.mocked(request).mockRejectedValue(new Error('boom'))

    renderWidget({ variant: 'strip' })
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't load the weather/i)
    expect(screen.getByRole('region', { name: 'Weather' })).toBeInTheDocument()
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
  })
})
