import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Medallion from '../../../src/components/ui/Medallion'

describe('Medallion', () => {
  it('renders its glyph', () => {
    const { container } = render(<Medallion>R</Medallion>)
    expect(container.textContent).toBe('R')
  })

  it('defaults to the brand scheme at md', () => {
    const { container } = render(<Medallion>R</Medallion>)
    const disc = container.firstChild
    expect(disc.className).toContain('w-[120px]')
    expect(disc.className).toContain('var(--gradient-brand)')
  })

  it('applies the requested size and scheme', () => {
    const { container } = render(
      <Medallion size="lg" scheme="danger">
        !
      </Medallion>,
    )
    const disc = container.firstChild
    expect(disc.className).toContain('w-[140px]')
    expect(disc.className).toContain('text-paper')
  })

  it('falls back to defaults for an unknown size or scheme', () => {
    const { container } = render(
      <Medallion size="enormous" scheme="chartreuse">
        R
      </Medallion>,
    )
    const disc = container.firstChild
    expect(disc.className).toContain('w-[120px]')
    expect(disc.className).toContain('var(--gradient-brand)')
  })

  it('is decorative by default — its glyph restates adjacent text', () => {
    const { container } = render(<Medallion>R</Medallion>)
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
  })

  it('lets a consumer opt back into the accessibility tree', () => {
    const { container } = render(<Medallion aria-hidden={false}>R</Medallion>)
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'false')
  })
})
