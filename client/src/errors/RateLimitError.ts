/**
 * RateLimitError — thrown when the server responds with HTTP 429.
 *
 * Rack::Attack throttles in production return 429 when a client exceeds the
 * configured request budget (login attempts, API calls per minute, etc.).
 * Consumers can toast this as a warning rather than an error since it's
 * usually self-healing after a short cooldown.
 */
export class RateLimitError extends Error {
  status: number

  constructor(message?: string) {
    super(message ?? 'Too many requests — please slow down and try again')
    this.name = 'RateLimitError'
    this.status = 429
  }
}
