import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LogCareDialog from '../../../src/components/plants/LogCareDialog'
import { ToastProvider } from '../../../src/context/ToastContext'
import type { Plant } from '../../../src/types/plant'
import type { Space } from '../../../src/types/space'
import type { Species } from '../../../src/types/species'

function spaceFixture(overrides: Partial<Space> = {}): Space {
  return {
    id: 1,
    name: 'Living Room',
    icon: 'couch',
    category: 'indoor',
    light_level: 'medium',
    temperature_level: 'average',
    humidity_level: 'average',
    archived_at: null,
    plants_count: 0,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function speciesFixture(overrides: Partial<Species> = {}): Species {
  return {
    id: 1,
    common_name: 'Monstera',
    scientific_name: null,
    watering_frequency_days: 7,
    feeding_frequency_days: null,
    light_requirement: null,
    humidity_preference: null,
    temperature_min: null,
    temperature_max: null,
    toxicity: null,
    pet_safe: null,
    difficulty: null,
    growth_rate: null,
    personality: 'dramatic',
    popular: false,
    description: null,
    care_tips: null,
    image_url: null,
    suggested_light_level: 'medium',
    suggested_temperature_level: 'average',
    suggested_humidity_level: 'average',
    plant_levels: { light: [], temperature: [], humidity: [] },
    ...overrides,
  }
}

function plantFixture(overrides: Partial<Plant> = {}): Plant {
  return {
    id: 7,
    nickname: 'Monty',
    notes: null,
    space_id: 1,
    space: spaceFixture(),
    species: speciesFixture(),
    calculated_watering_days: 7,
    calculated_feeding_days: null,
    water_status: 'healthy',
    feed_status: 'healthy',
    days_until_water: 5,
    days_until_feed: 14,
    last_watered_at: null,
    last_fed_at: null,
    acquired_at: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

const PLANT = plantFixture()

type PostedCareLogBody = { care_log: Record<string, unknown> }

let postedBody: PostedCareLogBody | null = null

function mockFetch(url: string, init?: RequestInit) {
  if (url.includes(`/api/v1/plants/${PLANT.id}/care_logs`) && init?.method === 'POST') {
    postedBody = JSON.parse(init.body as string) as PostedCareLogBody
    // careLogSchema requires created_at too — the server stamps it, the
    // client never sends it, so the fixture adds it back onto the echo.
    return Response.json({ id: 1, created_at: '2026-05-01T00:00:00Z', ...postedBody.care_log })
  }
  return Response.json({})
}

function renderWithProviders(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <ToastProvider>{ui}</ToastProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

describe('LogCareDialog', () => {
  beforeEach(() => {
    postedBody = null
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, init) => mockFetch(String(url), init)),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders Water + Feed care-type options and defaults to Water', () => {
    renderWithProviders(<LogCareDialog plant={PLANT} open onClose={() => {}} />)
    const waterRadio = screen.getByRole('radio', { name: /Water/ })
    const feedRadio = screen.getByRole('radio', { name: /Feed/ })
    expect(waterRadio).toBeChecked()
    expect(feedRadio).not.toBeChecked()
  })

  it('honours the defaultCareType prop', () => {
    renderWithProviders(<LogCareDialog plant={PLANT} open onClose={() => {}} defaultCareType="feeding" />)
    expect(screen.getByRole('radio', { name: /Feed/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Water/ })).not.toBeChecked()
  })

  it('submits a POST with care_type, performed_at, and notes', async () => {
    const onClose = vi.fn()
    renderWithProviders(<LogCareDialog plant={PLANT} open onClose={onClose} />)

    fireEvent.click(screen.getByRole('radio', { name: /Feed/ }))
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'gave half-strength' } })
    fireEvent.click(screen.getByRole('button', { name: /^Log care$/ }))

    await waitFor(() => expect(postedBody).not.toBeNull())
    expect(postedBody!.care_log.care_type).toBe('feeding')
    expect(postedBody!.care_log.notes).toBe('gave half-strength')
    expect(typeof postedBody!.care_log.performed_at).toBe('string')
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('omits notes when textarea is empty', async () => {
    renderWithProviders(<LogCareDialog plant={PLANT} open onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /^Log care$/ }))
    await waitFor(() => expect(postedBody).not.toBeNull())
    expect(postedBody!.care_log.notes).toBeNull()
  })
})
