import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthBody from '../../components/auth/AuthBody'
import PasswordStrengthBar from '../../components/form/PasswordStrengthBar'
import TextInput from '../../components/form/TextInput'
import Action from '../../components/ui/Action'
import Emphasis from '../../components/ui/Emphasis'
import { useAuth } from '../../hooks/useAuth'
import { useFormSubmit } from '../../hooks/useFormSubmit'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')

  const navigate = useNavigate()
  const { register } = useAuth()
  // No client-side password-match check — Rails `has_secure_password` returns
  // `password_confirmation: ["doesn't match Password"]` alongside every other
  // validation failure (email taken, password too short, etc), so letting the
  // server validate guarantees the user sees ALL errors on a single submit
  // instead of a short-circuited subset.
  const { submitting, handleSubmit, fieldErrors, formRef } = useFormSubmit({
    action: () => register(name, email, password, passwordConfirmation),
    successMessage: 'Account created — welcome to Rootine!',
    errorMessage: 'Registration failed',
    onSuccess: () => navigate('/welcome', { replace: true }),
  })

  return (
    <AuthBody
      showProviders={false}
      preheading="Join Rootine"
      heading={
        <>
          Adopt your <Emphasis>first friend</Emphasis>
        </>
      }
      subtitle="Takes about a minute. Next you'll tell us why you're here — it shapes how Rootine treats you."
    >
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
        <TextInput
          label="Your name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoComplete="name"
          error={fieldErrors.name}
        />

        <TextInput
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          error={fieldErrors.email}
        />

        <div>
          <TextInput
            label="Password"
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

        {/* Confirm field stays revealed once any of: password typed, confirm
         * typed, or server returned a confirm error. Avoids the field
         * vanishing mid-error if the user clears password to retry. */}
        {(password || passwordConfirmation || fieldErrors.passwordConfirmation) && (
          <TextInput
            label="Confirm password"
            type="password"
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            required
            autoComplete="new-password"
            error={fieldErrors.passwordConfirmation}
          />
        )}

        <Action type="submit" variant="primary" disabled={submitting} className="w-full">
          {submitting ? 'Creating account...' : 'Create account'}
        </Action>
      </form>
    </AuthBody>
  )
}
