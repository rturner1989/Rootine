import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import SpaceGroups from '../../../src/components/encyclopedia/SpaceGroups'

function renderGroups(groups) {
  return render(
    <MemoryRouter>
      <SpaceGroups groups={groups} />
    </MemoryRouter>,
  )
}

describe('SpaceGroups', () => {
  it('renders a section per space with its species', () => {
    renderGroups([
      { space: { id: 1, name: 'Living Room', icon: 'couch' }, species: [{ id: 9, common_name: 'Snake Plant', pet_safe: false }] },
      { space: { id: 2, name: 'Bedroom', icon: 'bed' }, species: [] },
    ])
    expect(screen.getByRole('heading', { name: /Living Room/i })).toBeInTheDocument()
    expect(screen.getByText('Snake Plant')).toBeInTheDocument()
  })

  it('shows an empty note for a space with no matches', () => {
    renderGroups([{ space: { id: 2, name: 'Bedroom', icon: 'bed' }, species: [] }])
    expect(screen.getByText(/nothing in the catalogue fits/i)).toBeInTheDocument()
  })
})
