import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { request } from '../../../src/api/client'
import { SearchProvider } from '../../../src/context/SearchContext'
import Encyclopedia from '../../../src/pages/encyclopedia/Encyclopedia'
import type { Space } from '../../../src/types/space'
import type { Species, SpeciesBrowsePayload, SpeciesGroupedPayload } from '../../../src/types/species'

// Encyclopedia only reads `request` from api/client.
vi.mock('../../../src/api/client', () => ({ request: vi.fn() }))

const mockedRequest = vi.mocked(request)

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
function speciesFixture(overrides: Partial<Species> = {}): Species {
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
function spaceFixture(overrides: Partial<Space> = {}): Space {
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
  afterEach(() => mockedRequest.mockReset())

  it('renders the species grid from the browse payload', async () => {
    mockedRequest.mockResolvedValue({
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
    } satisfies SpeciesBrowsePayload)

    renderPage()
    expect(await screen.findByText('Monstera Deliciosa')).toBeInTheDocument()
  })

  it('shows the filtered-empty state when the grid comes back empty', async () => {
    mockedRequest.mockResolvedValue({
      species: [],
      facets: { pet_safe: 0, difficulty: {}, light: {} },
    } satisfies SpeciesBrowsePayload)

    renderPage()
    await waitFor(() => expect(screen.getByText(/no species match/i)).toBeInTheDocument())
  })

  it('renders grouped sections when view=spaces', async () => {
    mockedRequest.mockResolvedValue({
      groups: [
        {
          space: spaceFixture({ id: 1, name: 'Living Room', icon: 'couch' }),
          species: [speciesFixture({ id: 9, common_name: 'Snake Plant', pet_safe: false })],
        },
      ],
    } satisfies SpeciesGroupedPayload)

    renderPage('/encyclopedia?view=spaces')
    expect(await screen.findByRole('heading', { name: /Living Room/i })).toBeInTheDocument()
  })

  it('shows an error state when the browse grid request fails', async () => {
    mockedRequest.mockRejectedValue(new Error('boom'))

    renderPage()
    expect(await screen.findByRole('heading', { name: /couldn't load/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    // A failed request must not be mistaken for "no results" — that's the
    // exact regression this branch guards against.
    expect(screen.queryByText(/no species match/i)).not.toBeInTheDocument()
  })

  it('shows an error state when the grouped view request fails', async () => {
    mockedRequest.mockRejectedValue(new Error('boom'))

    renderPage('/encyclopedia?view=spaces')
    expect(await screen.findByRole('heading', { name: /couldn't load/i })).toBeInTheDocument()
    expect(screen.queryByText(/add a space to see recommendations/i)).not.toBeInTheDocument()
  })
})
