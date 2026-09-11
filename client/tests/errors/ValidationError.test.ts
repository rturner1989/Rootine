import { describe, expect, it } from 'vitest'
import { ValidationError } from '../../src/errors/ValidationError'

describe('ValidationError', () => {
  it('is an Error subclass so instanceof Error still works', () => {
    const err = new ValidationError({ email: 'is required' })
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(ValidationError)
  })

  it('stores the fields object on the instance', () => {
    const err = new ValidationError({ email: 'is required', password: 'is too short' })
    expect(err.fields).toEqual({
      email: 'is required',
      password: 'is too short',
    })
  })

  it('uses the first fields entry as the top-level message', () => {
    const err = new ValidationError({ email: 'is required', password: 'is too short' })
    expect(err.message).toBe('is required')
  })

  it('falls back to a generic message when no fields are provided', () => {
    const err = new ValidationError()
    expect(err.message).toBe('Validation failed')
    expect(err.fields).toEqual({})
  })

  it('sets the name to "ValidationError" so error reporters label it correctly', () => {
    const err = new ValidationError({ email: 'is required' })
    expect(err.name).toBe('ValidationError')
  })
})
