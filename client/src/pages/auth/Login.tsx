import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthBody from '../../components/auth/AuthBody'
import TextInput from '../../components/form/TextInput'
import Action from '../../components/ui/Action'
import Emphasis from '../../components/ui/Emphasis'
import { useAuth } from '../../hooks/useAuth'
import { useFormSubmit } from '../../hooks/useFormSubmit'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const navigate = useNavigate()
  const { login } = useAuth()

  const { submitting, handleSubmit, fieldErrors, formRef } = useFormSubmit({
    action: () => login(email, password),
    successMessage: 'Welcome back!',
    errorMessage: 'Login failed',
    // Auth failures (401) aren't tied to a single field, but UX-wise we
    // surface the message under email so the user gets the same red-border
    // + focus treatment they'd see for a 422 validation error elsewhere.
    errorField: 'email',
    onSuccess: () => navigate('/', { replace: true }),
  })

  return (
    <AuthBody
      showProviders={false}
      preheading="Sign in"
      heading={
        <>
          Welcome <Emphasis>back</Emphasis>
        </>
      }
      subtitle="Enter your email and password. Streak stays safe — we won't count you late for today."
    >
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
        <TextInput
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          error={fieldErrors.email}
        />

        <TextInput
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />

        <div className="text-right">
          <Action to="/forgot-password" variant="unstyled" className="text-xs font-bold text-emerald hover:underline">
            Forgot password?
          </Action>
        </div>

        <Action type="submit" variant="primary" disabled={submitting} className="w-full">
          {submitting ? 'Logging in...' : 'Log in'}
        </Action>
      </form>
    </AuthBody>
  )
}
