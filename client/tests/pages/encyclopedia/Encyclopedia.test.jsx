import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { request } from '../../../src/api/client'
import { SearchProvider } from '../../../src/context/SearchContext'
import Encyclopedia from '../../../src/pages/encyclopedia/Encyclopedia'

vi.mock('../../../src/api/client', () => ({ request: vi.fn() }))

function renderPage(entry = '/encyclopedia') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
        <SearchProvider>
          <Encyclopedia />
        </SearchProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// speciesSchema requires the full Species#as_json field set.
function speciesFixture(overrides) {
  return {
    id: 1,
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
    ...overrides,
  }
}

// spaceSchema requires the full Space#as_json field set.
function spaceFixture(overrides) {
  return {
    id: 1,
    name: 'Space',
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

describe('Encyclopedia', () => {
  afterEach(() => vi.mocked(request).mockReset())

  it('renders the species grid from the browse payload', async () => {
    vi.mocked(request).mockResolvedValue({
      species: [
        speciesFixture({
          id: 1,
          common_name: 'Monstera Deliciosa',
          scientific_name: 'Monstera deliciosa',
          // pet_safe: true so the returned species agrees with facets.pet_safe
          // below — Species.browse_facets counts poisonous_to_pets == false
          // (i.e. pet_safe: true) catalogue-wide, so a facet count of 1
          // implies at least one safe species exists.
          pet_safe: true,
          difficulty: 'beginner',
        }),
      ],
      facets: { pet_safe: 1, difficulty: { beginner: 1 }, light: { medium: 1 } },
    })

    renderPage()
    expect(await screen.findByText('Monstera Deliciosa')).toBeInTheDocument()
  })

  it('shows the filtered-empty state when the grid comes back empty', async () => {
    vi.mocked(request).mockResolvedValue({ species: [], facets: { pet_safe: 0, difficulty: {}, light: {} } })

    renderPage()
    await waitFor(() => expect(screen.getByText(/no species match/i)).toBeInTheDocument())
  })

  it('renders grouped sections when view=spaces', async () => {
    vi.mocked(request).mockResolvedValue({
      groups: [
        {
          space: spaceFixture({ id: 1, name: 'Living Room', icon: 'couch' }),
          species: [speciesFixture({ id: 9, common_name: 'Snake Plant', pet_safe: false })],
        },
      ],
    })

    renderPage('/encyclopedia?view=spaces')
    expect(await screen.findByRole('heading', { name: /Living Room/i })).toBeInTheDocument()
  })
})
