/**
 * NotFoundError — thrown when the server responds with HTTP 404.
 *
 * Usually means the resource the request targeted (a plant, a space, a photo)
 * either never existed, has been deleted, or belongs to another user (our
 * controllers scope through current_user and return 404 on foreign records).
 */
export class NotFoundError extends Error {
  status: number

  constructor(message?: string) {
    super(message ?? 'Not found')
    this.name = 'NotFoundError'
    this.status = 404
  }
}
