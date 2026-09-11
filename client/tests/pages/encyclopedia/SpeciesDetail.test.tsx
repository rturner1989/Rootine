import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { request } from '../../../src/api/client'
import SpeciesDetail from '../../../src/pages/encyclopedia/SpeciesDetail'
import type { Species } from '../../../src/types/species'

// SpeciesDetail only reads `request` from api/client.
vi.mock('../../../src/api/client', () => ({ request: vi.fn() }))

const mockedRequest = vi.mocked(request)

function renderAt(id: number) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/encyclopedia/species/${id}`]}>
        <Routes>
          <Route path="/encyclopedia/species/:id" element={<SpeciesDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// speciesSchema (with community: true) requires the full Species#as_json
// field set plus the community block.
function speciesFixture(overrides: Partial<Species> = {}): Species {
  return {
    id: 5,
    common_name: 'Species',
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
    personality: 'chill',
    popular: true,
    description: null,
    care_tips: null,
    image_url: null,
    suggested_light_level: 'medium',
    suggested_temperature_level: 'average',
    suggested_humidity_level: 'average',
    plant_levels: {
      light: ['low', 'medium', 'bright'],
      temperature: ['cool', 'average', 'warm'],
      humidity: ['dry', 'average', 'humid'],
    },
    community: null,
    ...overrides,
  }
}

describe('SpeciesDetail', () => {
  afterEach(() => mockedRequest.mockReset())

  it('renders reference data and the community block', async () => {
    mockedRequest.mockResolvedValue(
      speciesFixture({
        id: 5,
        common_name: 'Snake Plant',
        scientific_name: 'Dracaena trifasciata',
        difficulty: 'beginner',
        pet_safe: false,
        community: { grower_count: 12, median_watering_days: 16, typical_light: 'low', kept_on_schedule_pct: 88 },
      }),
    )

    renderAt(5)
    // common_name appears in both the page h1 and SpeciesView's h2 — assert
    // the h1 specifically rather than a bare text match.
    expect(await screen.findByRole('heading', { level: 1, name: 'Snake Plant' })).toBeInTheDocument()
    expect(screen.getByText(/how people grow this/i)).toBeInTheDocument()
    expect(screen.getByText(/12/)).toBeInTheDocument()
  })

  it('shows the below-floor note when community is null', async () => {
    mockedRequest.mockResolvedValue(
      speciesFixture({
        id: 6,
        common_name: 'Rare Fern',
        scientific_name: 'Rara filix',
        difficulty: 'advanced',
        pet_safe: null,
        community: null,
      }),
    )

    renderAt(6)
    expect(await screen.findByRole('heading', { level: 1, name: 'Rare Fern' })).toBeInTheDocument()
    expect(screen.getByText(/not enough growers yet/i)).toBeInTheDocument()
  })
})
