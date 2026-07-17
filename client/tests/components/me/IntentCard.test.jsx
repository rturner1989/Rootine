import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import IntentCard from '../../../src/components/me/IntentCard'

describe('IntentCard', () => {
  it('shows every intent, not just the chosen one', () => {
    render(<IntentCard profile={{ onboarding_intent: 'forgetful' }} />)

    expect(screen.getByText('Forgetful')).toBeInTheDocument()
    expect(screen.getByText('Just starting out')).toBeInTheDocument()
    expect(screen.getByText("Something's wrong")).toBeInTheDocument()
    expect(screen.getByText('Browsing')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
  })

  // The highlight is colour-only, which a screen reader can't see.
  it('marks the chosen intent, and only that one', () => {
    render(<IntentCard profile={{ onboarding_intent: 'browsing' }} />)

    const chosen = screen.getAllByRole('listitem').filter((item) => item.getAttribute('aria-current') === 'true')
    expect(chosen).toHaveLength(1)
    expect(chosen[0]).toHaveTextContent('Browsing')
  })

  // The column is nullable and 34 real accounts have no intent, so this
  // is a state the card meets, not an edge case.
  it('still lists the options when the user never picked one', () => {
    render(<IntentCard profile={{ onboarding_intent: null }} />)

    expect(screen.getByText(/didn't pick one/i)).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
    expect(screen.queryByRole('listitem', { current: true })).not.toBeInTheDocument()
  })

  it('treats an unknown intent as no choice rather than blanking', () => {
    render(<IntentCard profile={{ onboarding_intent: 'nonsense' }} />)

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
    render(<IntentCard profile={{ onboarding_intent: 'forgetful' }} />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  })
})
