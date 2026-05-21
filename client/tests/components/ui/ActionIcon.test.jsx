import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ActionIcon from '../../../src/components/ui/ActionIcon'

describe('ActionIcon', () => {
  // Tooltip only shows on hover-capable devices — stub the (hover: hover) gate.
  beforeEach(() => {
    window.matchMedia = vi
      .fn()
      .mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  })

  it('renders a button with the label as accessible name', () => {
    render(<ActionIcon icon={faXmark} label="Close menu" />)
    expect(screen.getByRole('button', { name: 'Close menu' })).toBeInTheDocument()
  })

  it('fires onClick when activated', () => {
    const onClick = vi.fn()
    render(<ActionIcon icon={faXmark} label="Close" onClick={onClick} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('applies the requested size — xs renders the 20px wrapper', () => {
    render(<ActionIcon icon={faXmark} label="Tiny" size="xs" />)
    expect(screen.getByRole('button', { name: 'Tiny' }).className).toMatch(/w-5\b.*h-5/)
  })

  it('applies the requested size — md renders the 36px wrapper', () => {
    render(<ActionIcon icon={faXmark} label="Big" size="md" />)
    expect(screen.getByRole('button', { name: 'Big' }).className).toMatch(/w-9\b.*h-9/)
  })

  it('applies the paper scheme classes', () => {
    render(<ActionIcon icon={faXmark} label="Chrome" scheme="paper" />)
    const button = screen.getByRole('button', { name: 'Chrome' })
    expect(button.className).toMatch(/bg-paper-deep/)
    expect(button.className).toMatch(/hover:bg-mint\/60/)
  })

  it('applies the ink scheme classes', () => {
    render(<ActionIcon icon={faXmark} label="Drawer" scheme="ink" />)
    const button = screen.getByRole('button', { name: 'Drawer' })
    expect(button.className).toMatch(/bg-ink\/\[0\.08\]/)
  })

  it('forwards ref to the underlying button', () => {
    const ref = createRef()
    render(<ActionIcon ref={ref} icon={faXmark} label="Anchor" />)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
    expect(ref.current).toHaveAttribute('aria-label', 'Anchor')
  })

  it('forwards kwargs (aria-haspopup, aria-expanded) to the underlying button', () => {
    render(<ActionIcon icon={faXmark} label="Menu" aria-haspopup="menu" aria-expanded={true} aria-controls="panel-x" />)
    const button = screen.getByRole('button', { name: 'Menu' })
    expect(button).toHaveAttribute('aria-haspopup', 'menu')
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(button).toHaveAttribute('aria-controls', 'panel-x')
  })

  it('renders a tooltip by default', () => {
    render(<ActionIcon icon={faXmark} label="With tip" />)
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'With tip' }))
    expect(screen.getByRole('tooltip')).toHaveTextContent('With tip')
  })

  it('suppresses the tooltip when tooltip={false}', () => {
    render(<ActionIcon icon={faXmark} label="Silent" tooltip={false} />)
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Silent' }))
    expect(screen.queryByRole('tooltip')).toBeNull()
  })
})
