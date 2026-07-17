import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Hero from '../../../src/components/me/Hero'

const logout = vi.fn().mockResolvedValue(undefined)
const success = vi.fn()

vi.mock('../../../src/hooks/useAuth', () => ({
  useAuth: () => ({ logout }),
}))

vi.mock('../../../src/context/ToastContext', () => ({
  useToast: () => ({ success }),
}))

const PROFILE = {
  name: 'Rob',
  email: 'gardener@rootine.app',
  joined_on: '2026-03-12',
}

describe('Hero', () => {
  it('renders the name as the page heading', () => {
    render(<Hero profile={PROFILE} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Rob')
  })

  it('renders the avatar initial', () => {
    render(<Hero profile={PROFILE} />)
    expect(screen.getByText('R')).toBeInTheDocument()
  })

  it('falls back to a placeholder initial when the name is missing', () => {
    render(<Hero profile={{ email: 'nobody@rootine.app' }} />)
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
    render(<Hero profile={PROFILE} />)
    expect(screen.getByText(`gardener@rootine.app · joined ${joined}`)).toBeInTheDocument()
  })

  it('omits the joined date when it is absent rather than rendering a dangling separator', () => {
    render(<Hero profile={{ name: 'Rob', email: 'gardener@rootine.app' }} />)
    expect(screen.getByText('gardener@rootine.app')).toBeInTheDocument()
  })

  it('omits the joined date when it is unparseable', () => {
    render(<Hero profile={{ ...PROFILE, joined_on: 'not-a-date' }} />)
    expect(screen.queryByText(/joined/)).not.toBeInTheDocument()
  })

  // Copy and toast both match Sidebar's log-out — one vocabulary.
  it('logs the user out and confirms it', async () => {
    render(<Hero profile={PROFILE} />)
    fireEvent.click(screen.getByRole('button', { name: /log out/i }))

    expect(logout).toHaveBeenCalled()
    await waitFor(() => expect(success).toHaveBeenCalledWith('Logged out'))
  })
})
