/**
 * UnauthorizedError — thrown when the server responds with HTTP 401.
 *
 * Covers two distinct cases with the same status code:
 *   1. Request with an access token that was rejected AND the refresh retry
 *      also failed → the user's session is genuinely expired.
 *   2. Request without an access token (e.g. login, register) that got a 401 →
 *      credentials are wrong.
 *
 * Consumers that need to distinguish the two can read the `.message` (the
 * server-provided reason) or check whether an access token was set at the
 * time of the call.
 */
export class UnauthorizedError extends Error {
  status: number

  constructor(message?: string) {
    super(message ?? 'Your session has expired — please sign in again')
    this.name = 'UnauthorizedError'
    this.status = 401
  }
}
