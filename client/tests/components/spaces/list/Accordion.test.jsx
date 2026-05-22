import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Accordion from '../../../../src/components/spaces/list/Accordion'

const space = { id: 1, name: 'living_room', icon: 'couch', category: 'indoor', plants_count: 2 }

function renderAccordion(overrides = {}) {
  const handlers = { onToggle: vi.fn(), onAddPlant: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn(), ...overrides }
  render(
    <Accordion space={space} isOpen={false} {...handlers}>
      <div>body</div>
    </Accordion>,
  )
  return handlers
}

describe('Accordion (list view) menu', () => {
  it('offers Add plant / Edit / Delete', () => {
    renderAccordion()
    fireEvent.click(screen.getByRole('button', { name: /actions/i }))
    expect(screen.getByRole('menuitem', { name: /Add plant/ })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Edit space/ })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Delete space/ })).toBeInTheDocument()
  })

  it('clicking Add plant fires onAddPlant with the space', () => {
    const { onAddPlant } = renderAccordion()
    fireEvent.click(screen.getByRole('button', { name: /actions/i }))
    fireEvent.click(screen.getByRole('menuitem', { name: /Add plant/ }))
    expect(onAddPlant).toHaveBeenCalledWith(space)
  })
})
