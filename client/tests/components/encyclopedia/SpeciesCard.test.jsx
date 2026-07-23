import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import SpeciesCard from '../../../src/components/encyclopedia/SpeciesCard'

function renderCard(species) {
  return render(
    <MemoryRouter>
      <SpeciesCard species={species} />
    </MemoryRouter>,
  )
}

describe('SpeciesCard', () => {
  const base = {
    id: 7,
    common_name: 'Monstera Deliciosa',
    scientific_name: 'Monstera deliciosa',
    difficulty: 'beginner',
    pet_safe: false,
  }

  it('renders common and scientific name', () => {
    renderCard(base)
    expect(screen.getByText('Monstera Deliciosa')).toBeInTheDocument()
    expect(screen.getByText('Monstera deliciosa')).toBeInTheDocument()
  })

  it('links to the species detail route', () => {
    renderCard(base)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/encyclopedia/species/7')
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
})
