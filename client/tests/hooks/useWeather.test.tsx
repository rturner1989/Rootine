import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from '../../src/api/client'
import { useWeather } from '../../src/hooks/useWeather'
import type { WeatherResponse } from '../../src/types/weather'
import { weatherResponseSchema } from '../../src/types/weather'

vi.mock('../../src/api/client', () => ({
  request: vi.fn(),
}))

const mockedRequest = vi.mocked(request)

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useWeather', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches /api/v1/weather and exposes today + week + locationLabel', async () => {
    mockedRequest.mockResolvedValue({
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
        // One of OpenMeteoClient#plant_care_advice's fixed set (open_meteo_client.rb:130-139) —
        // scheme 'heat' + temperature 22 matches its "bright day" branch.
        advice: 'Bright day — outdoor plants will need your help.',
      },
      week: [
        { date: '2026-05-02', scheme: 'heat', icon: '☀', icon_name: 'sun', label: 'Clear', temperature: 22 },
        { date: '2026-05-03', scheme: 'sky', icon: '☁', icon_name: 'cloud', label: 'Cloudy', temperature: 18 },
      ],
      location_label: 'Greenwich (default)',
    } satisfies WeatherResponse)

    const { result } = renderHook(() => useWeather(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(mockedRequest).toHaveBeenCalledWith('/api/v1/weather', weatherResponseSchema)
    expect(result.current.today?.label).toBe('Clear')
    expect(result.current.week).toHaveLength(2)
    expect(result.current.locationLabel).toBe('Greenwich (default)')
  })

  it('returns null today + empty week before resolution', () => {
    mockedRequest.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useWeather(), { wrapper: makeWrapper() })
    expect(result.current.today).toBeNull()
    expect(result.current.week).toEqual([])
    expect(result.current.isLoading).toBe(true)
  })
})
