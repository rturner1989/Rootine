import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import SpeciesCard from '../../../src/components/encyclopedia/SpeciesCard'
import type { Species, SpeciesIndexResult, SpeciesSearchResult } from '../../../src/types/species'

function speciesFixture(overrides: Partial<Species> = {}): Species {
  return {
    id: 7,
    common_name: 'Monstera Deliciosa',
    scientific_name: 'Monstera deliciosa',
    watering_frequency_days: 7,
    feeding_frequency_days: null,
    light_requirement: null,
    humidity_preference: null,
    temperature_min: null,
    temperature_max: null,
    toxicity: null,
    pet_safe: false,
    difficulty: 'beginner',
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
    perenual_id: 1468,
    common_name: 'orchid',
    scientific_name: "Calanthe 'Kozu Spice'",
    image_url: null,
    source: 'perenual',
    ...overrides,
  }
}

function renderCard(species: SpeciesIndexResult) {
  return render(
    <MemoryRouter>
      <SpeciesCard species={species} />
    </MemoryRouter>,
  )
}

describe('SpeciesCard', () => {
  const base = speciesFixture()

  it('renders common and scientific name', () => {
    renderCard(base)
    expect(screen.getByText('Monstera Deliciosa')).toBeInTheDocument()
    expect(screen.getByText('Monstera deliciosa')).toBeInTheDocument()
  })

  it('links to the species detail route', () => {
    renderCard(base)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/encyclopedia/species/7')
  })

  it('links a Perenual-only result (no local id) through its perenual_id', () => {
    renderCard(speciesSearchResultFixture())
    const href = screen.getByRole('link').getAttribute('href')
    if (!href) throw new Error('expected the species link to have an href')
    expect(href).toContain('/encyclopedia/species/lookup?')
    expect(href).toContain('perenual_id=1468')
    expect(decodeURIComponent(href)).toContain('common_name=orchid')
  })

  it('shows the pet-safety trait from the server tri-state', () => {
    renderCard({ ...base, pet_safe: true })
    expect(screen.getByText('Pet-safe')).toBeInTheDocument()
  })

  it('does not claim safety when pet_safe is unknown', () => {
    renderCard({ ...base, pet_safe: null })
    expect(screen.queryByText('Pet-safe')).not.toBeInTheDocument()
    expect(screen.getByText('Pet safety unknown')).toBeInTheDocument()
  })

  it('keeps a visible focus ring on the card link', () => {
    renderCard(base)
    // Regression guard: the link strips the default outline, so it must
    // supply a focus-visible ring replacement (WCAG 2.4.7).
    expect(screen.getByRole('link').className).toMatch(/focus-visible:ring/)
  })

  it('renders the species image when image_url is present', () => {
    const { container } = renderCard({ ...base, image_url: 'https://example.com/monstera.jpg' })
    const image = container.querySelector('img')
    expect(image).not.toBeNull()
    expect(image).toHaveAttribute('src', 'https://example.com/monstera.jpg')
  })

  it('falls back to the emoji tile when there is no image', () => {
    const { container } = renderCard({ ...base, image_url: null })
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('🌿')).toBeInTheDocument()
  })
})
