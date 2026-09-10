import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import EditPlantDialog from '../../../src/components/plants/EditPlantDialog'
import { ToastProvider } from '../../../src/context/ToastContext'
import type { Plant } from '../../../src/types/plant'
import type { Space } from '../../../src/types/space'
import type { Species } from '../../../src/types/species'

// spaceSchema requires the full Space#as_json field set.
function spaceFixture(overrides: Partial<Space> = {}): Space {
  return {
    id: 10,
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

// speciesSchema requires the full Species#as_json field set.
const SPECIES_FIXTURE: Species = {
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
}

// plantSchema requires the full Plant#as_json field set.
const PLANT: Plant = {
  id: 7,
  nickname: 'Monty',
  notes: 'A leafy friend',
  space_id: 10,
  space: spaceFixture({ id: 10, name: 'Living Room' }),
  species: SPECIES_FIXTURE,
  calculated_watering_days: 7,
  calculated_feeding_days: null,
  water_status: 'healthy',
  feed_status: 'unknown',
  days_until_water: 5,
  days_until_feed: null,
  last_watered_at: '2026-05-01T00:00:00Z',
  last_fed_at: null,
  acquired_at: '2026-01-01',
  created_at: '2026-01-01T00:00:00Z',
}

const SPACES = [
  spaceFixture({ id: 10, name: 'Living Room', icon: 'couch' }),
  spaceFixture({ id: 11, name: 'Bedroom', icon: 'bed' }),
]

type PatchedPlantBody = { plant: Record<string, unknown> }

let patchedBody: PatchedPlantBody | null = null

function defaultMockFetch(url: string, init?: RequestInit) {
  if (url.includes('/api/v1/spaces')) {
    return Response.json(SPACES)
  }
  if (url.includes(`/api/v1/plants/${PLANT.id}`) && init?.method === 'PATCH') {
    patchedBody = JSON.parse(init.body as string) as PatchedPlantBody
    return Response.json({ ...PLANT, ...patchedBody.plant })
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

describe('EditPlantDialog', () => {
  beforeEach(() => {
    patchedBody = null
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, init) => defaultMockFetch(String(url), init)),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('pre-fills nickname, space, and notes from the plant prop', async () => {
    renderWithProviders(<EditPlantDialog plant={PLANT} open onClose={() => {}} />)
    expect(await screen.findByDisplayValue('Monty')).toBeInTheDocument()
    expect(screen.getByDisplayValue('A leafy friend')).toBeInTheDocument()
    await waitFor(() => {
      const select = screen.getByLabelText('Space') as HTMLSelectElement
      expect(select.value).toBe('10')
    })
  })

  it('disables Save changes until a field changes', async () => {
    renderWithProviders(<EditPlantDialog plant={PLANT} open onClose={() => {}} />)
    const save = screen.getByRole('button', { name: /^Save changes$/ })
    expect(save).toBeDisabled()

    const nicknameInput = await screen.findByDisplayValue('Monty')
    fireEvent.change(nicknameInput, { target: { value: 'Monty II' } })
    await waitFor(() => expect(save).not.toBeDisabled())
  })

  it('submits a PATCH with the edited fields and closes', async () => {
    const onClose = vi.fn()
    renderWithProviders(<EditPlantDialog plant={PLANT} open onClose={onClose} />)

    const nicknameInput = await screen.findByDisplayValue('Monty')
    fireEvent.change(nicknameInput, { target: { value: 'Monty II' } })
    fireEvent.click(screen.getByRole('button', { name: /^Save changes$/ }))

    await waitFor(() => expect(patchedBody).not.toBeNull())
    expect(patchedBody!.plant).toMatchObject({
      nickname: 'Monty II',
      space_id: 10,
      notes: 'A leafy friend',
    })
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('renders the delete-link only when onDeleteRequest is provided', () => {
    const { rerender } = renderWithProviders(<EditPlantDialog plant={PLANT} open onClose={() => {}} />)
    expect(screen.queryByRole('button', { name: /Delete plant/i })).toBeNull()

    rerender(
      <MemoryRouter>
        <QueryClientProvider client={new QueryClient()}>
          <ToastProvider>
            <EditPlantDialog plant={PLANT} open onClose={() => {}} onDeleteRequest={() => {}} />
          </ToastProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: /Delete plant/i })).toBeInTheDocument()
  })
})
