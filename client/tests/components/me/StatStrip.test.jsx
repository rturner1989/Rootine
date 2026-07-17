import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import StatStrip from '../../../src/components/me/StatStrip'

const STATS = {
  care_streak_days: 7,
  login_streak_days: 3,
  plants_count: 12,
  care_logs_count: 62,
  vitality_percent: 87,
}

describe('StatStrip', () => {
  it('renders nothing without stats', () => {
    const { container } = render(<StatStrip />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the four server-backed stats', () => {
    render(<StatStrip stats={STATS} />)

    expect(screen.getByText('Streak')).toBeInTheDocument()
    expect(screen.getByText('Greenhouse')).toBeInTheDocument()
    expect(screen.getByText('Care logged')).toBeInTheDocument()
    expect(screen.getByText('Vitality')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
  })

  it('renders values with their units alongside', () => {
    render(<StatStrip stats={STATS} />)

    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('days')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('plants')).toBeInTheDocument()
    expect(screen.getByText('87%')).toBeInTheDocument()
  })

  // Without a text-node space between them a screen reader reads "7days".
  it('separates value from unit in the accessible text', () => {
    render(<StatStrip stats={STATS} />)
    const streak = screen.getByText('Streak').closest('li')
    expect(streak.textContent).toContain('7 days')
  })

  it('singularises units at a count of one', () => {
    render(<StatStrip stats={{ ...STATS, care_streak_days: 1, plants_count: 1, care_logs_count: 1 }} />)

    expect(screen.getByText('day')).toBeInTheDocument()
    expect(screen.getByText('plant')).toBeInTheDocument()
    expect(screen.getByText('time')).toBeInTheDocument()
  })

  it('renders zeroed stats rather than hiding them', () => {
    render(<StatStrip stats={{ ...STATS, care_streak_days: 0, vitality_percent: 0 }} />)

    expect(screen.getByText('days')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
  })
})
