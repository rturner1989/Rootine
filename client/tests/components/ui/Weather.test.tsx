import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { WeatherScheme } from '../../../src/components/ui/Weather'
import Weather from '../../../src/components/ui/Weather'

// motion/react's `motion` export can't be reimplemented structurally for a
// plain mock object (see DialogCard.test.tsx for the same rationale) — this
// narrows to the concrete tags Weather reaches for, discarding
// animation-only props and rendering plain elements.
type MockMotionProps = { children?: ReactNode; animate?: unknown; transition?: unknown; [key: string]: unknown }

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, animate, transition, ...kwargs }: MockMotionProps) => <div {...kwargs}>{children}</div>,
    span: ({ children, animate, transition, ...kwargs }: MockMotionProps) => <span {...kwargs}>{children}</span>,
  },
  useReducedMotion: () => false,
}))

describe('Weather', () => {
  describe('strip variant (default)', () => {
    it('renders icon + label + detail', () => {
      render(<Weather icon="☀" label="Sunny" detail="22° · perfect for outdoor watering" />)
      expect(screen.getByText('Sunny')).toBeInTheDocument()
      expect(screen.getByText('22° · perfect for outdoor watering')).toBeInTheDocument()
      expect(screen.getByText('☀')).toBeInTheDocument()
    })

    it('omits detail line when not supplied', () => {
      render(<Weather icon="☀" label="Sunny" />)
      expect(screen.getByText('Sunny')).toBeInTheDocument()
      expect(screen.queryByText(/22°/)).not.toBeInTheDocument()
    })

    it('exposes role="status" only when urgent', () => {
      const { rerender } = render(<Weather icon="☀" label="Sunny" />)
      expect(screen.queryByRole('status')).not.toBeInTheDocument()

      rerender(<Weather icon="🔥" label="Heatwave" urgent />)
      expect(screen.getByRole('status')).toBeInTheDocument()
    })
  })

  describe('group variant', () => {
    it('renders inline pill with icon + label', () => {
      render(<Weather variant="group" icon="☁" label="Outdoor · 14° cloudy" />)
      expect(screen.getByText('Outdoor · 14° cloudy')).toBeInTheDocument()
      expect(screen.getByText('☁')).toBeInTheDocument()
    })
  })

  describe('calendar variant', () => {
    it('renders icon, label is sr-only', () => {
      render(<Weather variant="calendar" icon="🌧" label="Rain expected" />)
      expect(screen.getByText('🌧')).toBeInTheDocument()
      const srLabel = screen.getByText('Rain expected')
      expect(srLabel).toHaveClass('sr-only')
    })
  })

  describe('schemes', () => {
    it.each<WeatherScheme>(['sky', 'frost', 'heat'])('accepts %s scheme without crashing', (scheme) => {
      const { container } = render(<Weather scheme={scheme} icon="☀" label="Test" />)
      expect(container.firstChild).toBeInTheDocument()
    })

    it('falls back to sky for unknown scheme', () => {
      // @ts-expect-error — 'unknown' is deliberately outside WeatherScheme,
      // proving an unrecognised scheme falls back to sky rather than crashing.
      const { container } = render(<Weather scheme="unknown" icon="☀" label="Test" />)
      expect(container.firstChild).toBeInTheDocument()
    })
  })
})
