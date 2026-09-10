import { describe, expect, it } from 'vitest'
import { NotFoundError } from '../../src/errors/NotFoundError'

describe('NotFoundError', () => {
  it('is an Error subclass', () => {
    const err = new NotFoundError()
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(NotFoundError)
  })

  it('sets status to 404', () => {
    expect(new NotFoundError().status).toBe(404)
  })

  it('defaults the message to "Not found"', () => {
    expect(new NotFoundError().message).toBe('Not found')
  })

  it('accepts an override message', () => {
    expect(new NotFoundError('Plant not found').message).toBe('Plant not found')
  })

  it('sets name to "NotFoundError"', () => {
    expect(new NotFoundError().name).toBe('NotFoundError')
  })
})
