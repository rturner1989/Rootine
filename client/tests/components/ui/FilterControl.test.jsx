import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import FilterControl from '../../../src/components/ui/FilterControl'

const SCHEMA = [
  { id: 'kinds', param: 'kinds', type: 'multi', isValid: () => true },
  { id: 'petSafe', param: 'pet_safe', type: 'bool' },
]

const EMPTY = { kinds: [], petSafe: null }

function renderControl(props = {}) {
  return render(
    <FilterControl
      schema={SCHEMA}
      filters={EMPTY}
      title="Filter things"
      onApply={vi.fn()}
      renderFields={(form) => (
        <button type="button" onClick={() => form.toggleValue('kinds', 'water')}>
          Toggle water
        </button>
      )}
      {...props}
    />,
  )
}

describe('FilterControl', () => {
  it('shows no count badge when nothing is active', () => {
    renderControl()
    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument()
  })

  it('labels the trigger with the active count', () => {
    renderControl({ filters: { kinds: ['water', 'feed'], petSafe: true } })
    expect(screen.getByRole('button', { name: 'Filters, 3 active' })).toBeInTheDocument()
  })

  it('excludes hidden axes from the active count', () => {
    renderControl({ filters: { kinds: ['water', 'feed'], petSafe: true }, hiddenAxisIds: ['kinds'] })
    expect(screen.getByRole('button', { name: 'Filters, 1 active' })).toBeInTheDocument()
  })

  it('opens the panel and applies the edited draft', async () => {
    const onApply = vi.fn()
    renderControl({ onApply })

    await userEvent.click(screen.getByRole('button', { name: 'Filters' }))
    await userEvent.click(screen.getByRole('button', { name: 'Toggle water' }))
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(onApply).toHaveBeenCalledWith({ kinds: ['water'], petSafe: null })
  })

  it('cancel closes without applying', async () => {
    const onApply = vi.fn()
    renderControl({ onApply })

    await userEvent.click(screen.getByRole('button', { name: 'Filters' }))
    await userEvent.click(screen.getByRole('button', { name: 'Toggle water' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onApply).not.toHaveBeenCalled()
  })

  it('reset empties the draft before apply', async () => {
    const onApply = vi.fn()
    renderControl({ filters: { kinds: ['feed'], petSafe: true }, onApply })

    await userEvent.click(screen.getByRole('button', { name: 'Filters, 2 active' }))
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }))
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(onApply).toHaveBeenCalledWith({ kinds: [], petSafe: null })
  })

  it('renders the chip row passed as children', () => {
    renderControl({ children: <span>Water chip</span> })
    expect(screen.getByText('Water chip')).toBeInTheDocument()
  })
})
