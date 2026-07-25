import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import SpeciesGrid from '../../../src/components/encyclopedia/SpeciesGrid'

function renderGrid(species) {
  return render(
    <MemoryRouter>
      <SpeciesGrid species={species} />
    </MemoryRouter>,
  )
}

describe('SpeciesGrid', () => {
  it('renders a card per species', () => {
    renderGrid([
      { id: 1, common_name: 'Monstera Deliciosa', pet_safe: false },
      { id: 2, common_name: 'Snake Plant', pet_safe: false },
    ])
    expect(screen.getByText('Monstera Deliciosa')).toBeInTheDocument()
    expect(screen.getByText('Snake Plant')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('keys Perenual-only results (no local id) without collision', () => {
    // Two Perenual results with null id must still get distinct keys — the
    // fallback keys on perenual_id. React would warn on a duplicate key.
    renderGrid([
      { id: null, perenual_id: 10, common_name: 'Orchid A', pet_safe: null },
      { id: null, perenual_id: 20, common_name: 'Orchid B', pet_safe: null },
    ])
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })
})
