/**
 * StatusError — a duck-typed read of the status/body metadata api/client.ts's
 * request() attaches to any thrown error via its internal withHttpMeta
 * helper (a plain Error for a non-field-keyed 4xx, or a ValidationError for
 * a field-keyed 422 — see request()'s 422 branch).
 *
 * Neither field is part of any exported error type, so this is a guard
 * rather than an `instanceof` check. A proper fix — a named error class for
 * a non-field-keyed 4xx response, alongside NotFoundError/RateLimitError/
 * ServerError/UnauthorizedError — needs a change to api/client.ts and is a
 * separate, deliberate follow-up, not bundled into this guard.
 *
 * Usage:
 *
 *   try {
 *     await changePassword.mutateAsync(...)
 *   } catch (error) {
 *     if (isStatusError(error) && error.status === 422) { ... }
 *   }
 */
export type StatusError = { status: number; body?: { error?: string } }

export function isStatusError(error: unknown): error is StatusError {
  return typeof error === 'object' && error !== null && 'status' in error
}
