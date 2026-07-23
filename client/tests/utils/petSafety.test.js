import { describe, expect, it } from 'vitest'
import { petSafetyLabel } from '../../src/utils/petSafety'

describe('petSafetyLabel', () => {
  it('true → pet-safe', () => {
    expect(petSafetyLabel(true)).toEqual({ text: 'Pet-safe', tone: 'safe' })
  })

  it('false → toxic to pets', () => {
    expect(petSafetyLabel(false)).toEqual({ text: 'Toxic to pets', tone: 'toxic' })
  })

  it('null → unknown, never a safety claim', () => {
    expect(petSafetyLabel(null)).toEqual({ text: 'Pet safety unknown', tone: 'unknown' })
  })

  it('undefined is treated as unknown too', () => {
    expect(petSafetyLabel(undefined).tone).toBe('unknown')
  })
})
