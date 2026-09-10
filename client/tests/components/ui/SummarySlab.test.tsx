import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import SummarySlab from '../../../src/components/ui/SummarySlab'

describe('SummarySlab', () => {
  it('renders its children inside a flex-col container', () => {
    const { container } = render(
      <SummarySlab>
        <SummarySlab.Row>First row</SummarySlab.Row>
        <SummarySlab.Row>Second row</SummarySlab.Row>
      </SummarySlab>,
    )
    expect(screen.getByText('First row')).toBeInTheDocument()
    expect(screen.getByText('Second row')).toBeInTheDocument()
    expect(container.firstChild).toHaveClass('flex', 'flex-col')
  })

  it('passes a custom className through to the slab container', () => {
    const { container } = render(<SummarySlab className="my-grid">{null}</SummarySlab>)
    expect(container.firstChild).toHaveClass('my-grid')
  })

  describe('Row', () => {
    it('locks min-height to 34px on mobile and 62px on desktop', () => {
      render(<SummarySlab.Row>Row content</SummarySlab.Row>)
      const row = screen.getByText('Row content')
      expect(row).toHaveClass('min-h-[34px]', 'lg:min-h-[62px]')
    })

    it('renders a dashed top border on every row except the first', () => {
      render(
        <SummarySlab>
          <SummarySlab.Row>First</SummarySlab.Row>
          <SummarySlab.Row>Second</SummarySlab.Row>
          <SummarySlab.Row>Third</SummarySlab.Row>
        </SummarySlab>,
      )
      // Tailwind first-child / not-first-child selectors are emitted as
      // `[&:not(:first-child)]:border-t` etc — every row carries the same
      // class string. The browser applies it conditionally, but the class
      // presence is what we assert here.
      const first = screen.getByText('First')
      const second = screen.getByText('Second')
      const third = screen.getByText('Third')
      expect(first).toHaveClass('[&:not(:first-child)]:border-t')
      expect(second).toHaveClass('[&:not(:first-child)]:border-t')
      expect(third).toHaveClass('[&:not(:first-child)]:border-t')
    })

    it('passes a custom className through to the row', () => {
      render(<SummarySlab.Row className="extra-class">Hi</SummarySlab.Row>)
      expect(screen.getByText('Hi')).toHaveClass('extra-class')
    })

    it('does not surface the divider as an aria element (decorative only)', () => {
      const { container } = render(
        <SummarySlab>
          <SummarySlab.Row>First</SummarySlab.Row>
          <SummarySlab.Row>Second</SummarySlab.Row>
        </SummarySlab>,
      )
      // The divider is a CSS border, not a separate <hr> element. There
      // should be no role="separator" descendants in the slab — the divider
      // is purely visual and does not enter the reading order.
      expect(container.querySelectorAll('[role="separator"]')).toHaveLength(0)
      expect(container.querySelectorAll('hr')).toHaveLength(0)
    })
  })
})
