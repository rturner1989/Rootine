import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Hero from '../../../src/components/me/Hero'
import type { useToast } from '../../../src/context/ToastContext'
import type { useAuth } from '../../../src/hooks/useAuth'
import type { User } from '../../../src/types/user'

const logout = vi.fn().mockResolvedValue(undefined)
const success = vi.fn()

// Hero only calls `logout` from useAuth.
vi.mock('../../../src/hooks/useAuth', (): { useAuth: () => Pick<ReturnType<typeof useAuth>, 'logout'> } => ({
  useAuth: () => ({ logout }),
}))

// Hero only reads `success` from useToast.
vi.mock('../../../src/context/ToastContext', (): { useToast: () => Pick<ReturnType<typeof useToast>, 'success'> } => ({
  useToast: () => ({ success }),
}))

function userFixture(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    email: 'gardener@rootine.app',
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
    joined_on: '2026-03-12',
    ...overrides,
  }
}

const PROFILE = userFixture()

describe('Hero', () => {
  it('renders the name as the page heading', () => {
    render(<Hero profile={PROFILE} onEdit={() => {}} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Rob')
  })

  it('renders the avatar initial', () => {
    render(<Hero profile={PROFILE} onEdit={() => {}} />)
    expect(screen.getByText('R')).toBeInTheDocument()
  })

  it('falls back to a placeholder initial when the name is missing', () => {
    // An empty string exercises the same falsy-name branch a missing field
    // would (`profile?.name?.[0]`) while satisfying User's `name: string`.
    render(<Hero profile={userFixture({ email: 'nobody@rootine.app', name: '' })} onEdit={() => {}} />)
    expect(screen.getByText('?')).toBeInTheDocument()
  })

  // Dates render in the reader's locale, so the expectation is derived
  // the same way rather than pinned to one region's format.
  it('renders email and joined date together', () => {
    const joined = new Date('2026-03-12').toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    render(<Hero profile={PROFILE} onEdit={() => {}} />)
    expect(screen.getByText(`gardener@rootine.app · joined ${joined}`)).toBeInTheDocument()
  })

  it('omits the joined date when it is absent rather than rendering a dangling separator', () => {
    // formatLongDate treats '' the same as a missing value (`if (!iso) return null`).
    render(<Hero profile={userFixture({ joined_on: '' })} onEdit={() => {}} />)
    expect(screen.getByText('gardener@rootine.app')).toBeInTheDocument()
  })

  it('omits the joined date when it is unparseable', () => {
    render(<Hero profile={{ ...PROFILE, joined_on: 'not-a-date' }} onEdit={() => {}} />)
    expect(screen.queryByText(/joined/)).not.toBeInTheDocument()
  })

  // Copy and toast both match Sidebar's log-out — one vocabulary.
  it('logs the user out and confirms it', async () => {
    render(<Hero profile={PROFILE} onEdit={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /log out/i }))

    expect(logout).toHaveBeenCalled()
    await waitFor(() => expect(success).toHaveBeenCalledWith('Logged out'))
  })
})
