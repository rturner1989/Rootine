import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import CommunityStats from '../../../src/components/encyclopedia/CommunityStats'

describe('CommunityStats', () => {
  it('renders the four server-computed stats', () => {
    render(
      <CommunityStats
        community={{ grower_count: 38, median_watering_days: 9, typical_light: 'medium', kept_on_schedule_pct: 72 }}
      />,
    )
    expect(screen.getByText(/38/)).toBeInTheDocument()
    expect(screen.getByText(/9/)).toBeInTheDocument()
    expect(screen.getByText(/72%/)).toBeInTheDocument()
    expect(screen.getByText(/medium/i)).toBeInTheDocument()
  })

  it('shows a below-the-floor note when there is no community data', () => {
    render(<CommunityStats community={null} />)
    expect(screen.getByText(/not enough growers yet/i)).toBeInTheDocument()
  })
})
