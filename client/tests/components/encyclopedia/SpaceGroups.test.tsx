import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { SpaceGroupsProps } from '../../../src/components/encyclopedia/SpaceGroups'
import SpaceGroups from '../../../src/components/encyclopedia/SpaceGroups'
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
    id: 9,
    common_name: 'Snake Plant',
    scientific_name: null,
    watering_frequency_days: 14,
    feeding_frequency_days: null,
    light_requirement: null,
    humidity_preference: null,
    temperature_min: null,
    temperature_max: null,
    toxicity: null,
    pet_safe: false,
    difficulty: null,
    growth_rate: null,
    personality: 'stoic',
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

function renderGroups(groups: SpaceGroupsProps['groups']) {
  return render(
    <MemoryRouter>
      <SpaceGroups groups={groups} />
    </MemoryRouter>,
  )
}

describe('SpaceGroups', () => {
  it('renders a section per space with its species', () => {
    renderGroups([
      {
        space: spaceFixture(),
        species: [speciesFixture()],
      },
      { space: spaceFixture({ id: 2, name: 'Bedroom', icon: 'bed' }), species: [] },
    ])
    expect(screen.getByRole('heading', { name: /Living Room/i })).toBeInTheDocument()
    expect(screen.getByText('Snake Plant')).toBeInTheDocument()
  })

  it('shows an empty note for a space with no matches', () => {
    renderGroups([{ space: spaceFixture({ id: 2, name: 'Bedroom', icon: 'bed' }), species: [] }])
    expect(screen.getByText(/nothing in the catalogue fits/i)).toBeInTheDocument()
  })
})
