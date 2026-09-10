import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import SpeciesGrid from '../../../src/components/encyclopedia/SpeciesGrid'
import type { Species, SpeciesIndexResult, SpeciesSearchResult } from '../../../src/types/species'

function speciesFixture(overrides: Partial<Species> = {}): Species {
  return {
    id: 1,
    common_name: 'Monstera Deliciosa',
    scientific_name: null,
    watering_frequency_days: 7,
    feeding_frequency_days: null,
    light_requirement: null,
    humidity_preference: null,
    temperature_min: null,
    temperature_max: null,
    toxicity: null,
    pet_safe: false,
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

function speciesSearchResultFixture(overrides: Partial<SpeciesSearchResult> = {}): SpeciesSearchResult {
  return {
    id: null,
    perenual_id: 10,
    common_name: 'Orchid A',
    scientific_name: null,
    image_url: null,
    source: 'perenual',
    ...overrides,
  }
}

function renderGrid(species: SpeciesIndexResult[]) {
  return render(
    <MemoryRouter>
      <SpeciesGrid species={species} />
    </MemoryRouter>,
  )
}

describe('SpeciesGrid', () => {
  it('renders a card per species', () => {
    renderGrid([
      speciesFixture({ id: 1, common_name: 'Monstera Deliciosa' }),
      speciesFixture({ id: 2, common_name: 'Snake Plant' }),
    ])
    expect(screen.getByText('Monstera Deliciosa')).toBeInTheDocument()
    expect(screen.getByText('Snake Plant')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('keys Perenual-only results (no local id) without collision', () => {
    // Two Perenual results with null id must still get distinct keys — the
    // fallback keys on perenual_id. React would warn on a duplicate key.
    renderGrid([
      speciesSearchResultFixture({ perenual_id: 10, common_name: 'Orchid A' }),
      speciesSearchResultFixture({ perenual_id: 20, common_name: 'Orchid B' }),
    ])
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })
})
