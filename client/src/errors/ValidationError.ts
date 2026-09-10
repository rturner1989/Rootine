/**
 * ValidationError — thrown when a form submission fails field-level validation,
 * either on the server (Rails returns 422 with a field-keyed errors object) or
 * on the client (e.g. a password-confirmation mismatch check before submit).
 *
 * Carries a `fields` object shaped as `{ fieldName: 'first error message' }`.
 * Field names are camelCase to match the React form state (the api/client.js
 * layer translates Rails' snake_case attribute names on the way in).
 *
 * useFormSubmit checks `err instanceof ValidationError` and routes the fields
 * into `fieldErrors` state, which the form then wires onto individual
 * TextInput `error` props. Anything that isn't a ValidationError falls through
 * to the generic toast error path.
 *
 * Usage — client-side throw:
 *
 *   if (password !== passwordConfirmation) {
 *     throw new ValidationError({
 *       passwordConfirmation: 'Passwords do not match',
 *     })
 *   }
 *
 * Usage — server-side (handled automatically by apiFetch on 422 responses).
 */
import type { FieldError } from '../types/form'

// { fieldName: message } — a map, not a single FieldError, but each value
// is a FieldError['message'] so the wire message type still traces back
// to the one declaration in types/form.ts.
type ValidationFields = Record<string, FieldError['message']>

export class ValidationError extends Error {
  fields: ValidationFields

  constructor(fields: ValidationFields = {}) {
    // Pick the first field's message as the top-level Error message so a stray
    // `throw` / console.error still shows something human-readable instead of
    // an empty "Error".
    const firstMessage = Object.values(fields)[0] ?? 'Validation failed'
    super(firstMessage)
    this.name = 'ValidationError'
    this.fields = fields
  }
}
