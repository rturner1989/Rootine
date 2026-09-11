/**
 * NetworkError — thrown when the underlying fetch() rejects before a response
 * is received. Indicates the request never reached the server: no internet,
 * DNS failure, CORS preflight rejection, or the browser blocking the call.
 *
 * Distinct from ServerError (which means the server did respond, just with 5xx)
 * so UI code can tell "you're offline" apart from "the server is broken".
 *
 * Has no `status` field because there was no HTTP response.
 */
export class NetworkError extends Error {
  constructor(message?: string) {
    super(message ?? 'Network connection failed — please check your internet')
    this.name = 'NetworkError'
  }
}
