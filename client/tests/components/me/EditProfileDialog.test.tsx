import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EditProfileDialog from '../../../src/components/me/EditProfileDialog'
import type { useToast } from '../../../src/context/ToastContext'
import type { useRemoveAvatar, useUpdateAvatar, useUpdateProfile } from '../../../src/hooks/useProfile'
import type { User } from '../../../src/types/user'

const updateProfile = vi.fn()
const updateAvatar = vi.fn()
const removeAvatar = vi.fn()
const success = vi.fn()

// EditProfileDialog only reads `mutateAsync` off each of these three
// mutations — isPending/isError/... on the real useMutation results are
// never touched.
vi.mock(
  '../../../src/hooks/useProfile',
  (): {
    useUpdateProfile: () => Pick<ReturnType<typeof useUpdateProfile>, 'mutateAsync'>
    useUpdateAvatar: () => Pick<ReturnType<typeof useUpdateAvatar>, 'mutateAsync'>
    useRemoveAvatar: () => Pick<ReturnType<typeof useRemoveAvatar>, 'mutateAsync'>
  } => ({
    useUpdateProfile: () => ({ mutateAsync: updateProfile }),
    useUpdateAvatar: () => ({ mutateAsync: updateAvatar }),
    useRemoveAvatar: () => ({ mutateAsync: removeAvatar }),
  }),
)

vi.mock(
  '../../../src/context/ToastContext',
  (): { useToast: () => Pick<ReturnType<typeof useToast>, 'success' | 'error'> } => ({
    useToast: () => ({ success, error: vi.fn() }),
  }),
)

function userFixture(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    email: 'rob@rootine.app',
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

const PROFILE = userFixture({ avatar_url: '/rails/active_storage/blob.jpg' })

function pickFile(file: File) {
  const input = screen.getByLabelText(/choose a profile picture/i)
  Object.defineProperty(input, 'files', { value: [file], configurable: true })
  fireEvent.change(input)
}

const FILE = new File(['bytes'], 'avatar.jpg', { type: 'image/jpeg' })

describe('EditProfileDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    updateProfile.mockResolvedValue({})
    updateAvatar.mockResolvedValue({})
    removeAvatar.mockResolvedValue({})
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:preview')
    globalThis.URL.revokeObjectURL = vi.fn()
  })

  it('prefills from the profile', () => {
    render(<EditProfileDialog open onClose={() => {}} profile={PROFILE} />)

    expect(screen.getByLabelText(/name/i)).toHaveValue('Rob')
    expect(screen.getByLabelText(/email/i)).toHaveValue('rob@rootine.app')
  })

  it('saves name and email without touching the avatar', async () => {
    render(<EditProfileDialog open onClose={() => {}} profile={PROFILE} />)
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Robert' } })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith({ name: 'Robert', email: 'rob@rootine.app' }))
    expect(updateAvatar).not.toHaveBeenCalled()
    expect(removeAvatar).not.toHaveBeenCalled()
  })

  it('uploads a picked file on save', async () => {
    render(<EditProfileDialog open onClose={() => {}} profile={PROFILE} />)
    pickFile(FILE)
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(updateAvatar).toHaveBeenCalledWith(FILE))
  })

  // Picking must not upload — otherwise Cancel would strand a new avatar
  // on the account.
  it('does not upload until save', () => {
    render(<EditProfileDialog open onClose={() => {}} profile={PROFILE} />)
    pickFile(FILE)

    expect(updateAvatar).not.toHaveBeenCalled()
  })

  it('removes the avatar on save when asked', async () => {
    render(<EditProfileDialog open onClose={() => {}} profile={PROFILE} />)
    fireEvent.click(screen.getByRole('button', { name: /remove/i }))
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(removeAvatar).toHaveBeenCalled())
    expect(updateAvatar).not.toHaveBeenCalled()
  })

  it('offers removal only when there is an avatar', () => {
    render(<EditProfileDialog open onClose={() => {}} profile={userFixture({ avatar_url: null })} />)

    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add a photo/i })).toBeInTheDocument()
  })

  // A picked file wins over a pending removal, so the two can't both fire.
  it('uploads rather than removes when a file is picked after Remove', async () => {
    render(<EditProfileDialog open onClose={() => {}} profile={PROFILE} />)
    fireEvent.click(screen.getByRole('button', { name: /remove/i }))
    pickFile(FILE)
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(updateAvatar).toHaveBeenCalledWith(FILE))
    expect(removeAvatar).not.toHaveBeenCalled()
  })

  it('confirms and closes on success', async () => {
    const onClose = vi.fn()
    render(<EditProfileDialog open onClose={onClose} profile={PROFILE} />)
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(success).toHaveBeenCalledWith('Profile updated'))
    expect(onClose).toHaveBeenCalled()
  })

  // The profile is a query result, so a refetch (window focus, or another
  // mutation invalidating it) hands back a new object with the same
  // contents. Keying the reset effect on it would wipe whatever the user
  // had typed.
  it('keeps typed edits when the profile query refetches underneath it', () => {
    const { rerender } = render(<EditProfileDialog open onClose={() => {}} profile={PROFILE} />)
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Half-typed nam' } })

    rerender(<EditProfileDialog open onClose={() => {}} profile={{ ...PROFILE }} />)

    expect(screen.getByLabelText(/name/i)).toHaveValue('Half-typed nam')
  })

  it('revokes the preview object URL rather than leaking it', async () => {
    const { unmount } = render(<EditProfileDialog open onClose={() => {}} profile={PROFILE} />)
    pickFile(FILE)
    await waitFor(() => expect(globalThis.URL.createObjectURL).toHaveBeenCalledWith(FILE))

    unmount()
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview')
  })
})
