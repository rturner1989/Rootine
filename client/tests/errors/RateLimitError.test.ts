import { describe, expect, it } from 'vitest'
import { RateLimitError } from '../../src/errors/RateLimitError'

describe('RateLimitError', () => {
  it('is an Error subclass', () => {
    const err = new RateLimitError()
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(RateLimitError)
  })

  it('sets status to 429', () => {
    expect(new RateLimitError().status).toBe(429)
  })

  it('uses a slow-down default message', () => {
    expect(new RateLimitError().message).toMatch(/too many/i)
  })

  it('accepts an override message', () => {
    expect(new RateLimitError('Slow down').message).toBe('Slow down')
  })

  it('sets name to "RateLimitError"', () => {
    expect(new RateLimitError().name).toBe('RateLimitError')
  })
})
