import { describe, expect, it } from 'vitest'
import { capitalise } from '../../src/utils/capitalise'

describe('capitalise', () => {
  it('upper-cases the first character', () => {
    expect(capitalise('beginner')).toBe('Beginner')
    expect(capitalise('bright')).toBe('Bright')
  })

  it('leaves the rest of the string untouched', () => {
    expect(capitalise('low_to_bright')).toBe('Low_to_bright')
  })

  it('returns an empty string for empty or nullish input', () => {
    expect(capitalise('')).toBe('')
    expect(capitalise(null)).toBe('')
    expect(capitalise(undefined)).toBe('')
  })
})
