import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Quote from '../../../src/components/ui/Quote'

describe('Quote', () => {
  describe('rendering', () => {
    it('renders the body text', () => {
      render(<Quote>Big leaves, bigger feelings.</Quote>)
      expect(screen.getByText(/Big leaves, bigger feelings\./)).toBeInTheDocument()
    })

    it('renders aria-hidden open and close glyphs', () => {
      const { container } = render(<Quote>Body</Quote>)
      const glyphs = container.querySelectorAll('span[aria-hidden="true"]')
      expect(glyphs).toHaveLength(2)
      expect(glyphs[0].textContent).toBe('“')
      expect(glyphs[1].textContent).toBe('”')
    })

    it('renders a <blockquote> by default; respects `as` override', () => {
      const { rerender, container } = render(<Quote>Body</Quote>)
      expect(container.querySelector('blockquote')).not.toBeNull()
      rerender(<Quote as="figcaption">Body</Quote>)
      expect(container.querySelector('figcaption')).not.toBeNull()
    })
  })

  describe('scheme + size', () => {
    it('paints glyphs with the coral colour by default', () => {
      const { container } = render(<Quote>Body</Quote>)
      const glyph = container.querySelector('span[aria-hidden="true"]')
      expect(glyph).toHaveClass('text-coral-deep')
    })

    it('switches glyph colour when scheme="emerald"', () => {
      const { container } = render(<Quote scheme="emerald">Body</Quote>)
      const glyph = container.querySelector('span[aria-hidden="true"]')
      expect(glyph).toHaveClass('text-emerald')
    })

    it('applies size="lg" body class', () => {
      render(<Quote size="lg">Body</Quote>)
      expect(screen.getByText(/Body/).closest('blockquote')).toHaveClass('text-lg')
    })

    it('falls back to defaults when scheme/size are unknown', () => {
      const { container } = render(
        // @ts-expect-error — 'unknown'/'huge' are deliberately outside Quote's
        // scheme/size unions, proving unrecognised values fall back to defaults.
        <Quote scheme="unknown" size="huge">
          Body
        </Quote>,
      )
      const glyph = container.querySelector('span[aria-hidden="true"]')
      expect(glyph).toHaveClass('text-coral-deep')
      expect(screen.getByText(/Body/).closest('blockquote')).toHaveClass('text-base')
    })
  })

  describe('passthrough', () => {
    it('forwards className to the body element', () => {
      render(<Quote className="custom-class">Body</Quote>)
      expect(screen.getByText(/Body/).closest('blockquote')).toHaveClass('custom-class')
    })
  })
})
