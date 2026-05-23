import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const { openAddPlant } = vi.hoisted(() => ({ openAddPlant: vi.fn() }))
vi.mock('../../../src/hooks/useAddPlant', () => ({ useAddPlant: () => ({ open: openAddPlant }) }))
vi.mock('../../../src/hooks/useSpaces', () => ({ useSpacePresets: () => ({ data: [] }) }))
vi.mock('../../../src/context/ToastContext', () => ({ useToast: () => ({ error: vi.fn(), success: vi.fn() }) }))

import AddSpaceDialog from '../../../src/components/spaces/AddSpaceDialog'

function renderDialog({ onAdd = vi.fn(), existingNames = new Set() } = {}) {
  render(<AddSpaceDialog open onClose={vi.fn()} onAdd={onAdd} existingNames={existingNames} />)
}

describe('AddSpaceDialog', () => {
  it('walks identity → environment → create → add-plants hand-off', async () => {
    const created = { id: 42, name: 'Greenhouse', icon: 'plant' }
    const onAdd = vi.fn().mockResolvedValue(created)
    renderDialog({ onAdd })

    const continueBtn = screen.getByRole('button', { name: /Continue/ })
    expect(continueBtn).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Greenhouse' } })
    expect(continueBtn).toBeEnabled()
    fireEvent.click(continueBtn)

    fireEvent.click(screen.getByRole('button', { name: /Add space/ }))
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Greenhouse', category: 'indoor', light_level: 'medium' }),
    )

    expect(await screen.findByText(/Greenhouse added/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Add a plant/ }))
    expect(openAddPlant).toHaveBeenCalledWith({ defaultSpaceId: 42 })
  })

  it('blocks a duplicate name with an inline error', () => {
    renderDialog({ existingNames: new Set(['Bedroom']) })
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Bedroom' } })
    expect(screen.getByText(/already in your list/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Continue/ })).toBeDisabled()
  })
})
