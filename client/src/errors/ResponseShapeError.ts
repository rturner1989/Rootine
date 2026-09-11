/**
 * ResponseShapeError — thrown when a server response parses as JSON but
 * fails the Zod schema request() was told to expect.
 *
 * The request succeeded and Rails responded — this isn't a network or
 * HTTP-status failure, so it doesn't belong alongside NetworkError /
 * UnauthorizedError / etc. It means the payload shape drifted from what the
 * client's schema encodes (a renamed or removed field, a type change).
 *
 * Carries fixed, human-readable copy: in Zod 4, ZodError.message is a
 * pretty-printed JSON array of issue objects, not something to put in front
 * of a user. The original ZodError survives on `cause` for debugging, and
 * `path` records which endpoint produced the bad payload.
 */
export class ResponseShapeError extends Error {
  path: string

  constructor(path: string, cause: unknown) {
    super("Something went wrong reading the server's response — please try again", { cause })
    this.name = 'ResponseShapeError'
    this.path = path
  }
}
