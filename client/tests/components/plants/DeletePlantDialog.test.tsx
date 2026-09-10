import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DeletePlantDialog from '../../../src/components/plants/DeletePlantDialog'
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

const NOW_MS = Date.now()
const RECENT_PLANT = plantFixture({
  created_at: new Date(NOW_MS - 5 * 24 * 60 * 60 * 1000).toISOString(),
})
const OLD_PLANT = {
  ...RECENT_PLANT,
  created_at: new Date(NOW_MS - 60 * 24 * 60 * 60 * 1000).toISOString(),
}

let deleteCalled = false

function mockFetch(url: string, init?: RequestInit) {
  if (url.includes(`/api/v1/plants/${RECENT_PLANT.id}`) && init?.method === 'DELETE') {
    deleteCalled = true
    return new Response(null, { status: 204 })
  }
  return Response.json({})
}

function renderWithProviders(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return render(
    <MemoryRouter initialEntries={['/plants/7']}>
      <QueryClientProvider client={client}>
        <ToastProvider>
          <Routes>
            <Route path="/plants/:id" element={ui} />
            <Route path="/house" element={<p>House page</p>} />
          </Routes>
        </ToastProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

describe('DeletePlantDialog', () => {
  beforeEach(() => {
    deleteCalled = false
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, init) => mockFetch(String(url), init)),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders Delete enabled for plants younger than 30 days', () => {
    renderWithProviders(<DeletePlantDialog plant={RECENT_PLANT} open onClose={() => {}} />)
    const deleteButton = screen.getByRole('button', { name: /^Delete$/ })
    expect(deleteButton).not.toBeDisabled()
    expect(screen.queryByLabelText(/Type the plant's name/)).toBeNull()
  })

  it('disables Delete until the typed name matches for plants older than 30 days', () => {
    renderWithProviders(<DeletePlantDialog plant={OLD_PLANT} open onClose={() => {}} />)
    const deleteButton = screen.getByRole('button', { name: /^Delete$/ })
    expect(deleteButton).toBeDisabled()

    const input = screen.getByLabelText(/Type the plant's name/)
    fireEvent.change(input, { target: { value: 'wrong' } })
    expect(deleteButton).toBeDisabled()

    fireEvent.change(input, { target: { value: 'Monty' } })
    expect(deleteButton).not.toBeDisabled()
  })

  it('fires DELETE, navigates to /house, and calls onClose on success', async () => {
    const onClose = vi.fn()
    renderWithProviders(<DeletePlantDialog plant={RECENT_PLANT} open onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /^Delete$/ }))

    await waitFor(() => expect(deleteCalled).toBe(true))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByText('House page')).toBeInTheDocument())
  })
})
