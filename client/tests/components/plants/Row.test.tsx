import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import Row from '../../../src/components/plants/Row'
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
    common_name: 'Monstera deliciosa',
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
    id: 1,
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

function renderRow(plant: Plant) {
  return render(
    <MemoryRouter>
      <Row plant={plant} />
    </MemoryRouter>,
  )
}

const baseHealthy = plantFixture()

describe('Row', () => {
  it('renders nickname and species name', () => {
    renderRow(baseHealthy)
    expect(screen.getByText('Monty')).toBeInTheDocument()
    expect(screen.getByText('Monstera deliciosa')).toBeInTheDocument()
  })

  it('links the row to the plant detail route', () => {
    renderRow(baseHealthy)
    expect(screen.getByRole('link', { name: /Monty/ })).toHaveAttribute('href', '/plants/1')
  })

  it('shows "In N days" when not due', () => {
    renderRow(plantFixture({ days_until_water: 5, days_until_feed: 14 }))
    expect(screen.getByText('In 5 days')).toBeInTheDocument()
  })

  it('shows "Due today" when zero days remain', () => {
    renderRow(plantFixture({ days_until_water: 0, water_status: 'due_today' }))
    expect(screen.getByText('Due today')).toBeInTheDocument()
  })

  it('renders the overdue label as Fraunces italic em', () => {
    const overdue = plantFixture({
      water_status: 'overdue',
      days_until_water: -3,
    })
    renderRow(overdue)
    const label = screen.getByText('3 days overdue')
    expect(label.tagName.toLowerCase()).toBe('em')
  })

  it('applies the wilting mood class when the plant is overdue', () => {
    const { container } = renderRow(plantFixture({ water_status: 'overdue', days_until_water: -2 }))
    const moodDot = container.querySelector('.mood-pulse')
    expect(moodDot).toBeInTheDocument()
  })

  it('applies the thirsty mood class when due today', () => {
    const { container } = renderRow(plantFixture({ water_status: 'due_today', days_until_water: 0 }))
    const moodDot = container.querySelector('.ring-sunshine')
    expect(moodDot).toBeInTheDocument()
  })

  it('applies the thriving mood class when nothing is due', () => {
    const { container } = renderRow(baseHealthy)
    const moodDot = container.querySelector('.ring-leaf')
    expect(moodDot).toBeInTheDocument()
  })
})
