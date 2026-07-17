import { useEffect, useRef, useState } from 'react'
import { useToast } from '../../context/ToastContext'
import { useFormSubmit } from '../../hooks/useFormSubmit'
import { useChangePassword } from '../../hooks/useProfile'
import PasswordStrengthBar from '../form/PasswordStrengthBar'
import TextInput from '../form/TextInput'
import Action from '../ui/Action'
import Card from '../ui/Card'
import Dialog from '../ui/Dialog'

const TITLE = 'Change password'

export default function ChangePasswordDialog({ open, onClose }) {
  const toast = useToast()
  const changePassword = useChangePassword()

  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  // A wrong current password comes back as a plain 422 message rather
  // than a field error, so it needs its own slot to land on the field
  // it actually belongs to.
  const [currentPasswordError, setCurrentPasswordError] = useState(null)
  // onSuccess closes over the render that began the submit, so it cannot
  // see state set inside `action` — gating on it would announce a
  // rejected change as a success. Record the outcome on a ref instead,
  // same as ResetPassword's expired-token branch.
  const rejectedRef = useRef(false)

  useEffect(() => {
    if (!open) return
    setCurrentPassword('')
    setPassword('')
    setPasswordConfirmation('')
    setCurrentPasswordError(null)
    rejectedRef.current = false
  }, [open])

  const { submitting, handleSubmit, fieldErrors, formRef } = useFormSubmit({
    action: async () => {
      setCurrentPasswordError(null)
      rejectedRef.current = false
      try {
        await changePassword.mutateAsync({ currentPassword, password, passwordConfirmation })
      } catch (error) {
        // A wrong current password is a 422 with a bare message, not the
        // field-errors shape useFormSubmit knows how to route — swallow
        // it so it lands on the field rather than a red toast.
        if (error.status === 422 && error.body?.error) {
          setCurrentPasswordError(error.body.error)
          rejectedRef.current = true
          return
        }
        throw error
      }
    },
    errorMessage: "Couldn't update your password",
    onSuccess: () => {
      if (rejectedRef.current) return
      toast.success('Password updated')
      onClose()
    },
  })

  return (
    <Dialog open={open} onClose={onClose} title={TITLE}>
      <Card.Header divider={false}>
        <p className="text-lg font-extrabold text-ink">{TITLE}</p>
      </Card.Header>

      <form ref={formRef} onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 gap-4">
        <Card.Body className="!flex-none flex flex-col gap-4">
          <TextInput
            label="Current password"
            type="password"
            value={currentPassword}
            onChange={(event) => {
              setCurrentPassword(event.target.value)
              setCurrentPasswordError(null)
            }}
            error={currentPasswordError}
            autoComplete="current-password"
            required
          />

          <div>
            <TextInput
              label="New password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={fieldErrors.password}
              autoComplete="new-password"
              required
            />
            {!fieldErrors.password && <PasswordStrengthBar password={password} />}
          </div>

          <TextInput
            label="Confirm new password"
            type="password"
            value={passwordConfirmation}
            onChange={(event) => setPasswordConfirmation(event.target.value)}
            error={fieldErrors.passwordConfirmation}
            autoComplete="new-password"
            required
          />
        </Card.Body>

        <Card.Footer divider={false} className="flex justify-end gap-2.5">
          <Action type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Action>
          <Action type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Update password'}
          </Action>
        </Card.Footer>
      </form>
    </Dialog>
  )
}
