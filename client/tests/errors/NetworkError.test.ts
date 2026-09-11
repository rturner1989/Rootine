import { describe, expect, it } from 'vitest'
import { NetworkError } from '../../src/errors/NetworkError'

describe('NetworkError', () => {
  it('is an Error subclass', () => {
    const err = new NetworkError()
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(NetworkError)
  })

  it('uses a helpful default message', () => {
    expect(new NetworkError().message).toMatch(/network/i)
  })

  it('accepts an override message', () => {
    expect(new NetworkError('Offline').message).toBe('Offline')
  })

  it('sets name to "NetworkError"', () => {
    expect(new NetworkError().name).toBe('NetworkError')
  })
})
