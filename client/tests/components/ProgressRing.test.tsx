import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ProgressRing from '../../src/components/ProgressRing'

describe('ProgressRing', () => {
  describe('rendering', () => {
    it('renders an <svg> inside the wrapper', () => {
      const { container } = render(<ProgressRing value={50} />)
      expect(container.querySelector('svg')).toBeInTheDocument()
    })

    it('exposes two <circle> elements: a mint track and a coloured fill', () => {
      const { container } = render(<ProgressRing value={50} />)
      const circles = container.querySelectorAll('circle')
      expect(circles).toHaveLength(2)
      expect(circles[0]).toHaveAttribute('stroke', 'var(--mint)')
      expect(circles[1]).toHaveAttribute('stroke', 'var(--leaf)')
    })

    it('accepts a custom `color` that retints the fill stroke', () => {
      const { container } = render(<ProgressRing value={50} color="var(--coral)" />)
      const fill = container.querySelectorAll('circle')[1]
      expect(fill).toHaveAttribute('stroke', 'var(--coral)')
    })

    it('hides the svg from assistive tech (aria-hidden) since the label context lives in children/nearby text', () => {
      const { container } = render(<ProgressRing value={50} />)
      expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('value clamping', () => {
    // strokeDashoffset = circumference * (1 - value/100). We verify the
    // clamp by checking the offset at the edges rather than asserting the
    // exact floating-point value — robust to size/stroke changes.
    const offsetFor = (container: HTMLElement) => {
      const fill = container.querySelectorAll('circle')[1]
      return Number.parseFloat(fill.getAttribute('stroke-dashoffset')!)
    }

    it('treats value=0 as a fully-empty ring (offset equals circumference)', () => {
      const { container } = render(<ProgressRing value={0} />)
      const dasharray = Number.parseFloat(container.querySelectorAll('circle')[1].getAttribute('stroke-dasharray')!)
      expect(offsetFor(container)).toBeCloseTo(dasharray)
    })

    it('treats value=100 as a fully-filled ring (offset is zero)', () => {
      const { container } = render(<ProgressRing value={100} />)
      expect(offsetFor(container)).toBeCloseTo(0)
    })

    it('clamps values above 100 so the ring never over-fills', () => {
      const { container: overfilled } = render(<ProgressRing value={150} />)
      const { container: maxed } = render(<ProgressRing value={100} />)
      expect(offsetFor(overfilled)).toBeCloseTo(offsetFor(maxed))
    })

    it('clamps negative values to zero', () => {
      const { container: negative } = render(<ProgressRing value={-20} />)
      const { container: zero } = render(<ProgressRing value={0} />)
      expect(offsetFor(negative)).toBeCloseTo(offsetFor(zero))
    })
  })

  describe('children overlay', () => {
    it('renders children in the centre when provided (e.g. "1/3")', () => {
      render(<ProgressRing value={33}>1/3</ProgressRing>)
      expect(screen.getByText('1/3')).toBeInTheDocument()
    })

    it('omits the overlay when no children are passed (pure ring)', () => {
      const { container } = render(<ProgressRing value={33} />)
      // The overlay is the absolute-positioned div inside the wrapper;
      // absence = no such div.
      expect(container.querySelector('.absolute')).toBeNull()
    })
  })
})
