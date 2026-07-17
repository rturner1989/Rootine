import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import IconDisc from '../../../src/components/ui/IconDisc'

describe('IconDisc', () => {
  it('renders its glyph', () => {
    const { container } = render(<IconDisc>🔥</IconDisc>)
    expect(container.textContent).toBe('🔥')
  })

  it('stays out of the accessibility tree — the adjacent label carries the meaning', () => {
    const { container } = render(<IconDisc>🔥</IconDisc>)
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
  })

  it('applies the consumer tint', () => {
    const { container } = render(<IconDisc tint="bg-sunshine/20 text-sunshine-deep">🔥</IconDisc>)
    expect(container.firstChild.className).toContain('bg-sunshine/20')
  })

  it('defaults to the mint tint', () => {
    const { container } = render(<IconDisc>🌿</IconDisc>)
    expect(container.firstChild.className).toContain('bg-mint')
  })
})
