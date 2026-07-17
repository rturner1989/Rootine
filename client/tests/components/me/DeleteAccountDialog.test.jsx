import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DeleteAccountDialog from '../../../src/components/me/DeleteAccountDialog'

const mutateAsync = vi.fn()
const logout = vi.fn()
const success = vi.fn()

vi.mock('../../../src/hooks/useProfile', () => ({
  useDeleteAccount: () => ({ mutateAsync, isPending: false }),
}))

vi.mock('../../../src/hooks/useAuth', () => ({
  useAuth: () => ({ logout }),
}))

vi.mock('../../../src/context/ToastContext', () => ({
  useToast: () => ({ success, error: vi.fn() }),
}))

const PROFILE = { stats: { plants_count: 7, care_logs_count: 62 } }

function typePassword(value) {
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
    const rejection = new Error('rejected')
    rejection.status = 422
    mutateAsync.mockRejectedValue(rejection)

    render(<DeleteAccountDialog open onClose={() => {}} profile={PROFILE} />)
    typePassword('wrong')
    fireEvent.click(screen.getByRole('button', { name: /delete my account/i }))

    expect(await screen.findByText('That password is incorrect')).toBeInTheDocument()
    expect(logout).not.toHaveBeenCalled()
    expect(success).not.toHaveBeenCalled()
  })
})
