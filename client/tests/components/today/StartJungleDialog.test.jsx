import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import StartJungleDialog from '../../../src/components/today/StartJungleDialog'
import { ToastProvider } from '../../../src/context/ToastContext'

const PRESETS = [
  { name: 'Living Room', icon: 'couch', category: 'indoor' },
  { name: 'Kitchen', icon: 'kitchen', category: 'indoor' },
  { name: 'Bedroom', icon: 'bed', category: 'indoor' },
]

// speciesSchema requires the full Species#as_json field set.
const SPECIES = [
  {
    id: 1,
    common_name: 'Snake Plant',
    scientific_name: 'Dracaena trifasciata',
    watering_frequency_days: 14,
    feeding_frequency_days: 60,
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
    suggested_light_level: 'low',
    suggested_temperature_level: 'average',
    suggested_humidity_level: 'dry',
    plant_levels: { light: ['low', 'medium', 'bright'], temperature: ['cool', 'average', 'warm'], humidity: ['dry', 'average', 'humid'] },
  },
]

// spaceSchema requires the full Space#as_json field set — the wizard's
// own payload only carries name/icon/category, so the mock fills in the
// rest the way Space#create's defaults would.
function fullSpace(partial) {
  return {
    light_level: 'medium',
    temperature_level: 'average',
    humidity_level: 'average',
    plants_count: 0,
    created_at: new Date().toISOString(),
    ...partial,
  }
}

let createdSpaces = []
let archivedSpaceIds = []
let nextSpaceId = 100

function mockFetch(url, init) {
  const path = String(url)
  if (path.includes('/api/v1/spaces/presets')) {
    return Response.json(PRESETS)
  }
  if (path.match(/\/api\/v1\/spaces\/\d+\/archive$/) && init?.method === 'POST') {
    const id = Number(path.match(/spaces\/(\d+)\/archive/)[1])
    archivedSpaceIds.push(id)
    const archived = createdSpaces.find((space) => space.id === id)
    return Response.json(fullSpace({ ...archived, id, archived_at: new Date().toISOString() }))
  }
  if (path.endsWith('/api/v1/spaces') && init?.method === 'POST') {
    const body = JSON.parse(init.body)
    const created = fullSpace({ id: nextSpaceId++, ...body.space, archived_at: null })
    createdSpaces.push(created)
    return Response.json(created)
  }
  if (path.includes('/api/v1/spaces')) {
    // useSpaces default scope='active' query — return empty initially.
    return Response.json([])
  }
  if (path.includes('/api/v1/species')) {
    return Response.json(SPECIES)
  }
  return Response.json([])
}

function renderWizard(props = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <ToastProvider>
          <StartJungleDialog open onClose={() => {}} {...props} />
        </ToastProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

describe('StartJungleDialog', () => {
  beforeEach(() => {
    createdSpaces = []
    archivedSpaceIds = []
    nextSpaceId = 100
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, init) => mockFetch(url, init)),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('opens on step 1 (Pick a space)', async () => {
    renderWizard()
    expect(await screen.findByText(/Step 1 of 3/)).toBeInTheDocument()
    expect(screen.getByText(/Pick a space/)).toBeInTheDocument()
  })

  it('disables Continue until a preset is selected', async () => {
    renderWizard()
    await screen.findByRole('checkbox', { name: /Living Room/ })
    const continueButton = screen.getByRole('button', { name: /^Continue$/ })
    expect(continueButton).toBeDisabled()
  })

  it('enables Continue after picking a preset', async () => {
    renderWizard()
    fireEvent.click(await screen.findByRole('checkbox', { name: /Living Room/ }))
    expect(screen.getByRole('button', { name: /^Continue$/ })).not.toBeDisabled()
  })

  it('creates the picked space and advances to step 2 (Pick a plant)', async () => {
    renderWizard()
    fireEvent.click(await screen.findByRole('checkbox', { name: /Living Room/ }))
    fireEvent.click(screen.getByRole('button', { name: /^Continue$/ }))

    await waitFor(() => expect(createdSpaces).toHaveLength(1))
    expect(createdSpaces[0].name).toBe('Living Room')
    expect(createdSpaces[0].icon).toBe('couch')
    expect(createdSpaces[0].category).toBe('indoor')
    await screen.findByText(/Step 2 of 3/)
  })

  it('preserves preset selection when navigating back from species step', async () => {
    renderWizard()
    fireEvent.click(await screen.findByRole('checkbox', { name: /Kitchen/ }))
    fireEvent.click(screen.getByRole('button', { name: /^Continue$/ }))
    await screen.findByText(/Step 2 of 3/)

    fireEvent.click(screen.getByRole('button', { name: /^Back$/ }))
    await screen.findByText(/Step 1 of 3/)

    const kitchen = await screen.findByRole('checkbox', { name: /Kitchen/ })
    expect(kitchen).toHaveAttribute('aria-checked', 'true')
  })

  it('does not re-create the space when Continue is hit with the same preset already created', async () => {
    renderWizard()
    fireEvent.click(await screen.findByRole('checkbox', { name: /Living Room/ }))
    fireEvent.click(screen.getByRole('button', { name: /^Continue$/ }))
    await waitFor(() => expect(createdSpaces).toHaveLength(1))

    fireEvent.click(await screen.findByRole('button', { name: /^Back$/ }))
    await screen.findByText(/Step 1 of 3/)
    fireEvent.click(screen.getByRole('button', { name: /^Continue$/ }))

    await screen.findByText(/Step 2 of 3/)
    // Still just one space created — no duplicate POST.
    expect(createdSpaces).toHaveLength(1)
    expect(archivedSpaceIds).toHaveLength(0)
  })

  it('archives the previous space and creates a new one when the preset is changed', async () => {
    renderWizard()
    fireEvent.click(await screen.findByRole('checkbox', { name: /Living Room/ }))
    fireEvent.click(screen.getByRole('button', { name: /^Continue$/ }))
    await waitFor(() => expect(createdSpaces).toHaveLength(1))
    const firstSpaceId = createdSpaces[0].id

    fireEvent.click(await screen.findByRole('button', { name: /^Back$/ }))
    fireEvent.click(await screen.findByRole('checkbox', { name: /Bedroom/ }))
    fireEvent.click(screen.getByRole('button', { name: /^Continue$/ }))

    await waitFor(() => expect(createdSpaces).toHaveLength(2))
    expect(createdSpaces[1].name).toBe('Bedroom')
    expect(archivedSpaceIds).toEqual([firstSpaceId])
  })

  it('switches to custom-name mode and back to suggestions', async () => {
    renderWizard()
    await screen.findByRole('checkbox', { name: /Living Room/ })

    fireEvent.click(screen.getByRole('button', { name: /Or name your own space/ }))
    expect(screen.getByLabelText('Name your space')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: /Living Room/ })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /Back to suggestions/ }))
    expect(screen.queryByLabelText('Name your space')).toBeNull()
    expect(screen.getByRole('checkbox', { name: /Living Room/ })).toBeInTheDocument()
  })

  it('creates a custom-named space when custom mode is used', async () => {
    renderWizard()
    fireEvent.click(await screen.findByRole('button', { name: /Or name your own space/ }))
    fireEvent.change(screen.getByLabelText('Name your space'), { target: { value: 'Garage' } })
    fireEvent.click(screen.getByRole('button', { name: /^Continue$/ }))

    await waitFor(() => expect(createdSpaces).toHaveLength(1))
    expect(createdSpaces[0].name).toBe('Garage')
    expect(createdSpaces[0].category).toBe('indoor')
  })
})
