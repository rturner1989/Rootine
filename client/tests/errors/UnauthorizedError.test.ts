import { describe, expect, it } from 'vitest'
import { UnauthorizedError } from '../../src/errors/UnauthorizedError'

describe('UnauthorizedError', () => {
  it('is an Error subclass', () => {
    const err = new UnauthorizedError()
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(UnauthorizedError)
  })

  it('sets status to 401', () => {
    expect(new UnauthorizedError().status).toBe(401)
  })

  it('uses a session-expired default message', () => {
    expect(new UnauthorizedError().message).toMatch(/session/i)
  })

  it('accepts an override message (e.g. from the server)', () => {
    expect(new UnauthorizedError('Invalid email or password').message).toBe('Invalid email or password')
  })

  it('sets name to "UnauthorizedError"', () => {
    expect(new UnauthorizedError().name).toBe('UnauthorizedError')
  })
})
