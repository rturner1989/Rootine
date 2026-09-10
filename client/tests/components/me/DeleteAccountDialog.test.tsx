import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DeleteAccountDialog from '../../../src/components/me/DeleteAccountDialog'
import type { useToast } from '../../../src/context/ToastContext'
import type { StatusError } from '../../../src/errors/StatusError'
import type { useAuth } from '../../../src/hooks/useAuth'
import type { useDeleteAccount } from '../../../src/hooks/useProfile'
import type { User, UserStats } from '../../../src/types/user'

const mutateAsync = vi.fn()
const logout = vi.fn()
const success = vi.fn()

// DeleteAccountDialog only calls useDeleteAccount for mutateAsync/isPending —
// the other useMutation fields (isError, data, reset, ...) are never read.
vi.mock(
  '../../../src/hooks/useProfile',
  (): { useDeleteAccount: () => Pick<ReturnType<typeof useDeleteAccount>, 'mutateAsync' | 'isPending'> } => ({
    useDeleteAccount: () => ({ mutateAsync, isPending: false }),
  }),
)

// Only `logout` is read from useAuth here — the dialog never touches user/login/etc.
vi.mock('../../../src/hooks/useAuth', (): { useAuth: () => Pick<ReturnType<typeof useAuth>, 'logout'> } => ({
  useAuth: () => ({ logout }),
}))

// Only success/error are read from useToast here.
vi.mock(
  '../../../src/context/ToastContext',
  (): { useToast: () => Pick<ReturnType<typeof useToast>, 'success' | 'error'> } => ({
    useToast: () => ({ success, error: vi.fn() }),
  }),
)

function statsFixture(overrides: Partial<UserStats> = {}): UserStats {
  return {
    care_streak_days: 0,
    login_streak_days: 0,
    plants_count: 0,
    care_logs_count: 0,
    vitality_percent: 0,
    ...overrides,
  }
}

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

const PROFILE = userFixture({ stats: statsFixture({ plants_count: 7, care_logs_count: 62 }) })

function typePassword(value: string) {
  fireEvent.change(screen.getByLabelText(/enter your password/i), { target: { value } })
}

describe('DeleteAccountDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mutateAsync.mockResolvedValue(null)
    logout.mockResolvedValue(undefined)
  })

  it('spells out what is about to be destroyed', () => {
    render(<DeleteAccountDialog open onClose={() => {}} profile={PROFILE} />)

    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('62')).toBeInTheDocument()
  })

  it('renders without stats rather than crashing on a cold cache', () => {
    render(<DeleteAccountDialog open onClose={() => {}} />)
    expect(screen.getByRole('button', { name: /delete my account/i })).toBeInTheDocument()
  })

  // The password is the safety gate — the server re-authenticates the
  // delete, so an empty field must not be submittable.
  it('keeps the confirm disabled until a password is entered', () => {
    render(<DeleteAccountDialog open onClose={() => {}} profile={PROFILE} />)
    const confirm = screen.getByRole('button', { name: /delete my account/i })
    expect(confirm).toBeDisabled()

    typePassword('hunter2')
    expect(confirm).toBeEnabled()
  })

  it('sends the password, then tears the session down', async () => {
    render(<DeleteAccountDialog open onClose={() => {}} profile={PROFILE} />)
    typePassword('hunter2')
    fireEvent.click(screen.getByRole('button', { name: /delete my account/i }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ currentPassword: 'hunter2' }))
    await waitFor(() => expect(logout).toHaveBeenCalled())
    expect(success).toHaveBeenCalledWith('Your account has been deleted')
  })

  it('reports a rejected password on the field and keeps the session', async () => {
    const rejection: Error & StatusError = Object.assign(new Error('rejected'), { status: 422 })
    mutateAsync.mockRejectedValue(rejection)

    render(<DeleteAccountDialog open onClose={() => {}} profile={PROFILE} />)
    typePassword('wrong')
    fireEvent.click(screen.getByRole('button', { name: /delete my account/i }))

    expect(await screen.findByText('That password is incorrect')).toBeInTheDocument()
    expect(logout).not.toHaveBeenCalled()
    expect(success).not.toHaveBeenCalled()
  })
})
