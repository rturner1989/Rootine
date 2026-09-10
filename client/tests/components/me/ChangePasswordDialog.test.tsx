import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ChangePasswordDialog from '../../../src/components/me/ChangePasswordDialog'
import type { useToast } from '../../../src/context/ToastContext'
import type { useChangePassword } from '../../../src/hooks/useProfile'

const mutateAsync = vi.fn()
const success = vi.fn()
const error = vi.fn()

// ChangePasswordDialog only reads `mutateAsync` from useChangePassword —
// isPending/isError/... on the real useMutation result are never touched.
vi.mock(
  '../../../src/hooks/useProfile',
  (): { useChangePassword: () => Pick<ReturnType<typeof useChangePassword>, 'mutateAsync'> } => ({
    useChangePassword: () => ({ mutateAsync }),
  }),
)

vi.mock(
  '../../../src/context/ToastContext',
  (): { useToast: () => Pick<ReturnType<typeof useToast>, 'success' | 'error'> } => ({
    useToast: () => ({ success, error }),
  }),
)

function fillForm({ current = 'oldpassword1', next = 'newpassword1' } = {}) {
  fireEvent.change(screen.getByLabelText(/current password/i), { target: { value: current } })
  fireEvent.change(screen.getByLabelText(/^new password/i), { target: { value: next } })
  fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: next } })
}

function rejectWith(status: number, body: unknown): Error & { status: number; body: unknown } {
  return Object.assign(new Error('rejected'), { status, body })
}

describe('ChangePasswordDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mutateAsync.mockResolvedValue({})
  })

  it('submits the three fields', async () => {
    render(<ChangePasswordDialog open onClose={() => {}} />)
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: /update password/i }))

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        currentPassword: 'oldpassword1',
        password: 'newpassword1',
        passwordConfirmation: 'newpassword1',
      }),
    )
  })

  it('confirms and closes on success', async () => {
    const onClose = vi.fn()
    render(<ChangePasswordDialog open onClose={onClose} />)
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: /update password/i }))

    await waitFor(() => expect(success).toHaveBeenCalledWith('Password updated'))
    expect(onClose).toHaveBeenCalled()
  })

  // Regression: onSuccess closes over the pre-submit render, so gating on
  // state set inside the action reported a rejected change as a success —
  // the dialog closed and claimed the password had been updated.
  describe('when the current password is wrong', () => {
    beforeEach(() => {
      mutateAsync.mockRejectedValue(rejectWith(422, { error: 'Current password is incorrect' }))
    })

    it('shows the error on the current-password field', async () => {
      render(<ChangePasswordDialog open onClose={() => {}} />)
      fillForm()
      fireEvent.click(screen.getByRole('button', { name: /update password/i }))

      expect(await screen.findByText('Current password is incorrect')).toBeInTheDocument()
      expect(screen.getByLabelText(/current password/i)).toHaveAttribute('aria-invalid', 'true')
    })

    it('does not claim success, and stays open', async () => {
      const onClose = vi.fn()
      render(<ChangePasswordDialog open onClose={onClose} />)
      fillForm()
      fireEvent.click(screen.getByRole('button', { name: /update password/i }))

      await screen.findByText('Current password is incorrect')
      expect(success).not.toHaveBeenCalled()
      expect(onClose).not.toHaveBeenCalled()
    })

    it('recovers — a later valid submit still succeeds', async () => {
      render(<ChangePasswordDialog open onClose={() => {}} />)
      fillForm()
      fireEvent.click(screen.getByRole('button', { name: /update password/i }))
      await screen.findByText('Current password is incorrect')

      mutateAsync.mockResolvedValue({})
      fireEvent.click(screen.getByRole('button', { name: /update password/i }))

      await waitFor(() => expect(success).toHaveBeenCalledWith('Password updated'))
    })
  })
})
