import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import FilterChips from '../../../src/components/ui/FilterChips'

describe('FilterChips', () => {
  const chips = [
    { key: 'plant-1', label: 'Monstera', clearLabel: 'Clear Monstera filter', onClear: vi.fn() },
    { key: 'kind-water', label: 'Water', clearLabel: 'Remove Water filter', onClear: vi.fn() },
  ]

  it('renders nothing when there are no chips', () => {
    const { container } = render(<FilterChips chips={[]} onClearAll={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a chip per descriptor', () => {
    render(<FilterChips chips={chips} onClearAll={vi.fn()} />)
    expect(screen.getByText('Monstera')).toBeInTheDocument()
    expect(screen.getByText('Water')).toBeInTheDocument()
  })

  it('clearing a chip calls only that chip handler', async () => {
    const clearMonstera = vi.fn()
    const clearWater = vi.fn()
    render(
      <FilterChips
        chips={[
          { key: 'plant-1', label: 'Monstera', clearLabel: 'Clear Monstera filter', onClear: clearMonstera },
          { key: 'kind-water', label: 'Water', clearLabel: 'Remove Water filter', onClear: clearWater },
        ]}
        onClearAll={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Clear Monstera filter' }))
    expect(clearMonstera).toHaveBeenCalledOnce()
    expect(clearWater).not.toHaveBeenCalled()
  })

  it('Clear all calls onClearAll', async () => {
    const onClearAll = vi.fn()
    render(<FilterChips chips={chips} onClearAll={onClearAll} />)

    await userEvent.click(screen.getByRole('button', { name: 'Clear all' }))
    expect(onClearAll).toHaveBeenCalledOnce()
  })

  it('renders a chip icon when one is supplied', () => {
    render(
      <FilterChips
        chips={[{ key: 'kind-water', label: 'Water', clearLabel: 'x', onClear: vi.fn(), icon: <span>💧</span> }]}
        onClearAll={vi.fn()}
      />,
    )
    expect(screen.getByText('💧')).toBeInTheDocument()
  })
})
