import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import SpaceCard from '../../src/components/SpaceCard'
import type { Space } from '../../src/types/space'

// Action renders Link for to-props, so SpaceCard's onClick version only
// needs Router context when the inner Action reaches for hooks. Wrap to
// keep this future-proof without exercising routing here.
const render_ = (ui: ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>)

const space = (overrides: Partial<Space> = {}): Space => ({
  id: 1,
  name: 'Living Room',
  icon: 'couch',
  category: 'indoor',
  light_level: 'medium',
  temperature_level: 'average',
  humidity_level: 'average',
  archived_at: null,
  plants_count: 3,
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

describe('SpaceCard', () => {
  describe('rendering', () => {
    it('shows the space name and plant count', () => {
      render_(<SpaceCard space={space()} />)
      expect(screen.getByText('Living Room')).toBeInTheDocument()
      expect(screen.getByText('3 plants')).toBeInTheDocument()
    })

    it('singularises the plant count for spaces with one plant', () => {
      render_(<SpaceCard space={space({ plants_count: 1 })} />)
      expect(screen.getByText('1 plant')).toBeInTheDocument()
    })

    it('renders the space emoji tile for a known icon slug', () => {
      render_(<SpaceCard space={space()} />)
      expect(screen.getByText('🛋️')).toBeInTheDocument()
    })

    it('omits the icon gracefully when the slug is unknown (no broken glyph)', () => {
      // @ts-expect-error — 'garage' is deliberately outside SpaceIcon's
      // inclusion list, proving the client degrades gracefully when the
      // backend has a slug the client doesn't know yet.
      const { container } = render_(<SpaceCard space={space({ icon: 'garage' })} />)
      expect(container.querySelector('svg')).toBeNull()
    })
  })

  describe('attention state', () => {
    it('hides the attention badge when attentionCount is 0', () => {
      render_(<SpaceCard space={space()} attentionCount={0} />)
      expect(screen.queryByText(/thirsty/)).not.toBeInTheDocument()
    })

    it('renders a coral "N thirsty" badge when attentionCount > 0', () => {
      render_(<SpaceCard space={space()} attentionCount={2} />)
      expect(screen.getByText('2 thirsty')).toBeInTheDocument()
    })

    it('switches the card border to coral/30 when attention is present', () => {
      const { container } = render_(<SpaceCard space={space()} attentionCount={2} />)
      expect((container.firstChild as HTMLElement).className).toContain('border-coral/30')
    })
  })

  describe('interaction', () => {
    it('fires onClick when activated', async () => {
      const onClick = vi.fn()
      render_(<SpaceCard space={space()} onClick={onClick} />)
      screen.getByRole('button').click()
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('is a button, not a div — so keyboard and screen readers treat it as interactive', () => {
      render_(<SpaceCard space={space()} />)
      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })
})
