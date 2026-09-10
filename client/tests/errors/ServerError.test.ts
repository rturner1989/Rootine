import { describe, expect, it } from 'vitest'
import { ServerError } from '../../src/errors/ServerError'

describe('ServerError', () => {
  it('is an Error subclass', () => {
    const err = new ServerError()
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(ServerError)
  })

  it('defaults status to 500', () => {
    expect(new ServerError().status).toBe(500)
  })

  it('preserves a specific 5xx status when provided', () => {
    expect(new ServerError(undefined, 503).status).toBe(503)
  })

  it('uses a try-again default message', () => {
    expect(new ServerError().message).toMatch(/try again/i)
  })

  it('accepts an override message', () => {
    expect(new ServerError('Database is down').message).toBe('Database is down')
  })

  it('sets name to "ServerError"', () => {
    expect(new ServerError().name).toBe('ServerError')
  })
})
