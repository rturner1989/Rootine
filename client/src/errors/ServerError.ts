/**
 * ServerError — thrown when the server responds with HTTP 5xx.
 *
 * Indicates the server did receive the request but failed to handle it.
 * Distinct from NetworkError (where no response was received at all). The
 * actual status code is preserved on `.status` so consumers can distinguish
 * 500 (bug) from 502/503/504 (upstream/infra).
 */
export class ServerError extends Error {
  status: number

  constructor(message?: string, status = 500) {
    super(message ?? 'Server error — please try again shortly')
    this.name = 'ServerError'
    this.status = status
  }
}
