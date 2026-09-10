import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import CareRing from '../../../src/components/ui/CareRing'

function getProgressCircle(container: HTMLElement): Element {
  // ProgressRing renders two circles — track (bg) then progress (fg).
  // The fg circle carries the dasharray/offset.
  return container.querySelector('svg circle:nth-of-type(2)')!
}

describe('CareRing', () => {
  describe('rendering', () => {
    it('renders the label and value', () => {
      render(<CareRing label="Water" value="In 3 days" />)
      expect(screen.getByText('Water')).toBeInTheDocument()
      expect(screen.getByText('In 3 days')).toBeInTheDocument()
    })

    it('renders the icon when provided', () => {
      render(<CareRing label="Water" value="In 3 days" icon="💧" />)
      expect(screen.getByText('💧')).toBeInTheDocument()
    })
  })

  describe('schemes', () => {
    it('passes the sky scheme colour to the ring stroke', () => {
      const { container } = render(<CareRing label="Water" value="x" scheme="sky" />)
      expect(getProgressCircle(container).getAttribute('stroke')).toBe('var(--sky-deep)')
    })

    it('passes the sunshine scheme colour', () => {
      const { container } = render(<CareRing label="Light" value="x" scheme="sunshine" />)
      expect(getProgressCircle(container).getAttribute('stroke')).toBe('var(--sunshine)')
    })

    it('passes the coral scheme colour', () => {
      const { container } = render(<CareRing label="Mood" value="x" scheme="coral" />)
      expect(getProgressCircle(container).getAttribute('stroke')).toBe('var(--coral)')
    })

    it('falls back to mint colour on unknown scheme', () => {
      // @ts-expect-error — 'bogus' is deliberately outside CareRing's scheme
      // union, proving an unrecognised scheme falls back to mint.
      const { container } = render(<CareRing label="X" value="x" scheme="bogus" />)
      expect(getProgressCircle(container).getAttribute('stroke')).toBe('var(--leaf)')
    })
  })

  describe('fill calculation', () => {
    it('strokeDashoffset = full circumference when fill is 0', () => {
      const { container } = render(<CareRing label="X" value="x" fill={0} />)
      const circle = getProgressCircle(container)
      expect(Number(circle.getAttribute('stroke-dashoffset'))).toBeCloseTo(
        Number(circle.getAttribute('stroke-dasharray')),
      )
    })

    it('strokeDashoffset = 0 when fill is 1', () => {
      const { container } = render(<CareRing label="X" value="x" fill={1} />)
      expect(Number(getProgressCircle(container).getAttribute('stroke-dashoffset'))).toBeCloseTo(0)
    })

    it('clamps fill above 1', () => {
      const { container } = render(<CareRing label="X" value="x" fill={2} />)
      expect(Number(getProgressCircle(container).getAttribute('stroke-dashoffset'))).toBeCloseTo(0)
    })

    it('clamps fill below 0', () => {
      const { container } = render(<CareRing label="X" value="x" fill={-1} />)
      const circle = getProgressCircle(container)
      expect(Number(circle.getAttribute('stroke-dashoffset'))).toBeCloseTo(
        Number(circle.getAttribute('stroke-dasharray')),
      )
    })
  })

  describe('emphasis (overdue)', () => {
    it('applies coral-deep text colour to the value when emphasis is set', () => {
      render(<CareRing label="Water" value="3d overdue" emphasis />)
      expect(screen.getByText('3d overdue').className).toMatch(/text-coral-deep/)
    })

    it('uses ink text colour by default', () => {
      render(<CareRing label="Water" value="In 3 days" />)
      expect(screen.getByText('In 3 days').className).toMatch(/text-ink\b/)
    })
  })

  describe('sizes', () => {
    it('uses md (48px ring) by default', () => {
      const { container } = render(<CareRing label="X" value="x" />)
      const svg = container.querySelector('svg')!
      expect(svg.getAttribute('width')).toBe('48')
      expect(svg.getAttribute('height')).toBe('48')
    })

    it('renders sm (42px) when requested', () => {
      const { container } = render(<CareRing label="X" value="x" size="sm" />)
      expect(container.querySelector('svg')!.getAttribute('width')).toBe('42')
    })
  })
})
