import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EditProfileDialog from '../../../src/components/me/EditProfileDialog'

const updateProfile = vi.fn()
const updateAvatar = vi.fn()
const removeAvatar = vi.fn()
const success = vi.fn()

vi.mock('../../../src/hooks/useProfile', () => ({
  useUpdateProfile: () => ({ mutateAsync: updateProfile }),
  useUpdateAvatar: () => ({ mutateAsync: updateAvatar }),
  useRemoveAvatar: () => ({ mutateAsync: removeAvatar }),
}))

vi.mock('../../../src/context/ToastContext', () => ({
  useToast: () => ({ success, error: vi.fn() }),
}))

const PROFILE = { name: 'Rob', email: 'rob@rootine.app', avatar_url: '/rails/active_storage/blob.jpg' }

function pickFile(file) {
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
    render(<EditProfileDialog open onClose={() => {}} profile={{ name: 'Rob', email: 'rob@rootine.app' }} />)

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

  it('revokes the preview object URL rather than leaking it', async () => {
    const { unmount } = render(<EditProfileDialog open onClose={() => {}} profile={PROFILE} />)
    pickFile(FILE)
    await waitFor(() => expect(globalThis.URL.createObjectURL).toHaveBeenCalledWith(FILE))

    unmount()
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview')
  })
})
