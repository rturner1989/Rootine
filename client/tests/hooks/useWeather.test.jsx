import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from '../../src/api/client'
import { useWeather } from '../../src/hooks/useWeather'

vi.mock('../../src/api/client', () => ({
  request: vi.fn(),
}))

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useWeather', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches /api/v1/weather and exposes today + week + locationLabel', async () => {
    request.mockResolvedValue({
      today: {
        scheme: 'heat',
        icon: '☀',
        icon_name: 'sun',
        label: 'Clear',
        detail: '22° · clear',
        temperature: 22,
        overnight_low: 14,
        rain_probability: 0,
        next_day: {
          label: 'Clear',
          icon: '☀',
          icon_name: 'sun',
          scheme: 'heat',
          temperature: 23,
          rain_probability: 0,
        },
        advice: 'Great day to water outdoor plants.',
      },
      week: [
        { date: '2026-05-02', scheme: 'heat', icon: '☀', icon_name: 'sun', label: 'Clear', temperature: 22 },
        { date: '2026-05-03', scheme: 'sky', icon: '☁', icon_name: 'cloud', label: 'Cloudy', temperature: 18 },
      ],
      location_label: 'Greenwich (default)',
    })

    const { result } = renderHook(() => useWeather(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(request).toHaveBeenCalledWith('/api/v1/weather', expect.anything())
    expect(result.current.today.label).toBe('Clear')
    expect(result.current.week).toHaveLength(2)
    expect(result.current.locationLabel).toBe('Greenwich (default)')
  })

  it('returns null today + empty week before resolution', () => {
    request.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useWeather(), { wrapper: makeWrapper() })
    expect(result.current.today).toBeNull()
    expect(result.current.week).toEqual([])
    expect(result.current.isLoading).toBe(true)
  })
})
