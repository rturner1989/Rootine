import { type FormEvent, useEffect, useRef, useState } from 'react'
import { useToast } from '../context/ToastContext'
import { RateLimitError } from '../errors/RateLimitError'
import { ValidationError } from '../errors/ValidationError'
import type { FieldError } from '../types/form'

type FieldErrors = Record<string, FieldError['message']>

type UseFormSubmitOptions = {
  action: () => Promise<unknown>
  successMessage?: string
  errorMessage?: string
  errorField?: string
  onSuccess?: () => void
}

/**
 * useFormSubmit — wraps the common "async form submit" lifecycle used by
 * auth forms (Login, Register), onboarding steps, Add Plant, profile update,
 * password change, and any other form in the app that follows the same
 * shape: preventDefault → submitting=true → await action → handle result
 * (toast or field errors) → submitting=false.
 *
 * Usage:
 *
 *   const { submitting, handleSubmit, fieldErrors, formRef } = useFormSubmit({
 *     action: () => login(email, password),
 *     successMessage: 'Welcome back!',
 *     errorMessage: 'Login failed',
 *     onSuccess: () => navigate(from, { replace: true }),
 *   })
 *
 *   return (
 *     <form ref={formRef} onSubmit={handleSubmit}>
 *       <TextInput name="email" error={fieldErrors.email} ... />
 *       ...
 *     </form>
 *   )
 *
 * Design notes:
 *
 * - `action` is a no-arg thunk so the hook doesn't need to know anything
 *   about the action's argument shape. Consumers close over their form
 *   state in the thunk. Same API for login(a,b), register(a,b,c,d), or
 *   updateProfile({...}).
 *
 * - `successMessage` is optional — omit it for forms whose success path is
 *   self-evident (e.g. a wizard advancing to the next step doesn't need a
 *   "Step saved" toast).
 *
 * - `onSuccess` is a callback, not a navigate prop. Consumers decide what
 *   happens after success: navigate, close a modal, refetch, or nothing.
 *
 * - Two error paths:
 *   1. `ValidationError` (server 422 or client-side throw) → errors land in
 *      `fieldErrors` keyed by field name. No toast — the inline UI already
 *      tells the user what's wrong.
 *   2. Any other Error → toast. If `errorField` is provided, the error
 *      message is ALSO attached as an inline error on that field, so login-
 *      style failures ("Invalid email or password") get the same red-border-
 *      and-focus treatment as a 422 validation error.
 *
 * - After ANY error the hook returns focus to the form so the user can
 *   immediately retry. ValidationError focuses the first invalid field
 *   (`[aria-invalid="true"]`); other errors focus the first input. Both
 *   require `formRef` to be attached to the consumer's <form> element.
 */
export function useFormSubmit({ action, successMessage, errorMessage, errorField, onSuccess }: UseFormSubmitOptions) {
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const formRef = useRef<HTMLFormElement>(null)
  const toast = useToast()

  // Focus the first invalid field after React commits the new aria-invalid
  // attributes. Runs on every fieldErrors change but early-returns when the
  // object is empty (set at the start of each submit, or on initial mount).
  useEffect(() => {
    if (Object.keys(fieldErrors).length === 0) return
    const firstInvalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')
    firstInvalid?.focus()
  }, [fieldErrors])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setFieldErrors({})
    try {
      await action()
      if (successMessage) {
        toast.success(successMessage)
      }
      onSuccess?.()
    } catch (err) {
      if (err instanceof ValidationError) {
        setFieldErrors(err.fields)
      } else {
        const message = (err instanceof Error ? err.message : undefined) || errorMessage || 'Something went wrong'
        // Rate limits are self-healing after a short cooldown — yellow,
        // not red. Everything else is a real error.
        if (err instanceof RateLimitError) {
          toast.warning(message)
        } else {
          toast.error(message)
        }
        if (errorField) {
          // Sets aria-invalid on the mapped field; the fieldErrors useEffect
          // above then picks it up and focuses it like a validation error.
          setFieldErrors({ [errorField]: message })
        } else {
          formRef.current?.querySelector<HTMLElement>('input, textarea, select')?.focus()
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  return { submitting, handleSubmit, fieldErrors, formRef }
}
