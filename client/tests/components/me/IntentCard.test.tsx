import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import IntentCard from '../../../src/components/me/IntentCard'
import type { User } from '../../../src/types/user'

function userFixture(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    email: 'rob@test.com',
    name: 'Rob',
    timezone: 'UTC',
    onboarded: true,
    onboarding_intent: null,
    onboarding_step_reached: 7,
    avatar_url: null,
    latitude: null,
    longitude: null,
    location_label: null,
    notify_care_reminders: true,
    notify_achievements: true,
    joined_on: '2026-01-01',
    ...overrides,
  }
}

describe('IntentCard', () => {
  it('shows every intent, not just the chosen one', () => {
    render(<IntentCard profile={userFixture({ onboarding_intent: 'forgetful' })} />)

    expect(screen.getByText('Forgetful')).toBeInTheDocument()
    expect(screen.getByText('Just starting out')).toBeInTheDocument()
    expect(screen.getByText("Something's wrong")).toBeInTheDocument()
    expect(screen.getByText('Browsing')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
  })

  // The highlight is colour-only, which a screen reader can't see.
  it('marks the chosen intent, and only that one', () => {
    render(<IntentCard profile={userFixture({ onboarding_intent: 'browsing' })} />)

    const chosen = screen.getAllByRole('listitem').filter((item) => item.getAttribute('aria-current') === 'true')
    expect(chosen).toHaveLength(1)
    expect(chosen[0]).toHaveTextContent('Browsing')
  })

  // The column is nullable and 34 real accounts have no intent, so this
  // is a state the card meets, not an edge case.
  it('still lists the options when the user never picked one', () => {
    render(<IntentCard profile={userFixture({ onboarding_intent: null })} />)

    expect(screen.getByText(/didn't pick one/i)).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
    expect(screen.queryByRole('listitem', { current: true })).not.toBeInTheDocument()
  })

  it('treats an unknown intent as no choice rather than blanking', () => {
    // @ts-expect-error — 'nonsense' is deliberately outside the intent enum,
    // proving the card treats a drifted/unknown value as no-choice rather
    // than crashing or blanking.
    render(<IntentCard profile={userFixture({ onboarding_intent: 'nonsense' })} />)

    expect(screen.getByText(/didn't pick one/i)).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
  })

  it('renders on a cold cache with no profile', () => {
    render(<IntentCard />)
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
  })

  // Read-only until something outside the wizard reads onboarding_intent —
  // a working picker here would change nothing.
  it('offers no way to change it', () => {
    render(<IntentCard profile={userFixture({ onboarding_intent: 'forgetful' })} />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  })
})
