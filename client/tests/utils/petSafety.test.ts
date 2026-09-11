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
    // undefined isn't part of Species['pet_safe'] (boolean | null) — the
    // wire value is always one or the other once parsed — but the
    // function's runtime guard still treats it as unknown, so this
    // exercises that defensive branch against a value the type disallows.
    expect(petSafetyLabel(undefined as unknown as boolean | null).tone).toBe('unknown')
  })
})
