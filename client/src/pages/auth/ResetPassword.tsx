import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiPatch } from '../../api/client'
import AuthBody from '../../components/auth/AuthBody'
import PasswordStrengthBar from '../../components/form/PasswordStrengthBar'
import TextInput from '../../components/form/TextInput'
import Action from '../../components/ui/Action'
import Emphasis from '../../components/ui/Emphasis'
import { useToast } from '../../context/ToastContext'
import { isStatusError } from '../../errors/StatusError'
import { useFormSubmit } from '../../hooks/useFormSubmit'

export default function ResetPassword() {
  const { token } = useParams()
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [expired, setExpired] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()

  // 410 Gone isn't a success (don't toast/navigate) AND isn't a field
  // error (useFormSubmit's ValidationError branch) — it's a whole-view
  // swap. Catch it in the action, record the outcome on a ref, and let
  // onSuccess gate the happy-path side effects on it.
  const outcomeRef = useRef<'success' | 'expired' | null>(null)

  const { submitting, handleSubmit, fieldErrors, formRef } = useFormSubmit({
    action: async () => {
      try {
        await apiPatch(`/api/v1/password_resets/${token}`, {
          password_reset: { password, password_confirmation: passwordConfirmation },
        })
        outcomeRef.current = 'success'
      } catch (err) {
        if (isStatusError(err) && err.status === 410) {
          outcomeRef.current = 'expired'
          setExpired(true)
          return
        }
        throw err
      }
    },
    errorMessage: "Couldn't update your password",
    onSuccess: () => {
      if (outcomeRef.current !== 'success') return
      toast.success('Password updated — log in with your new one.')
      navigate('/login', { replace: true })
    },
  })

  if (expired) {
    return (
      <AuthBody
        preheading="Link expired"
        heading={
          <>
            Link <Emphasis>expired</Emphasis>
          </>
        }
        subtitle="This reset link has already been used or has expired. Request a fresh one and we'll send you another."
        showProviders={false}
        showSwitch={false}
      >
        <Action to="/forgot-password" variant="primary" className="w-full">
          Request a new link
        </Action>
      </AuthBody>
    )
  }

  return (
    <AuthBody
      preheading="New password"
      heading={
        <>
          Choose a new <Emphasis>password</Emphasis>
        </>
      }
      subtitle="Almost there. Pick something memorable but not guessable — 8+ characters, with a letter and a number."
      showProviders={false}
      showSwitch={false}
    >
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
        <div>
          <TextInput
            label="New password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            hint="At least 8 characters, with a letter and a number."
            autoComplete="new-password"
            error={fieldErrors.password}
          />
          {!fieldErrors.password && <PasswordStrengthBar password={password} />}
        </div>

        {(password || passwordConfirmation || fieldErrors.passwordConfirmation) && (
          <TextInput
            label="Confirm new password"
            type="password"
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            required
            autoComplete="new-password"
            error={fieldErrors.passwordConfirmation}
          />
        )}

        <Action type="submit" variant="primary" disabled={submitting} className="w-full">
          {submitting ? 'Updating...' : 'Update password'}
        </Action>
      </form>
    </AuthBody>
  )
}
