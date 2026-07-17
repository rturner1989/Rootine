import { describe, expect, it } from 'vitest'
import { INTENT_CONFIG } from '../../src/components/onboarding/intentConfig'
import { getIntent, INTENT_KEYS, INTENTS } from '../../src/utils/intents'

describe('intents', () => {
  it('exposes the four canonical onboarding_intent enum values in wizard order', () => {
    expect(INTENT_KEYS).toEqual(['forgetful', 'just_starting', 'sick_plant', 'browsing'])
  })

  it('carries identity only — wizard behaviour lives in onboarding', () => {
    for (const intent of Object.values(INTENTS)) {
      expect(intent).toHaveProperty('label')
      expect(intent).toHaveProperty('emoji')
      expect(intent).not.toHaveProperty('skipSteps')
      expect(intent).not.toHaveProperty('completionRoute')
    }
  })

  describe('getIntent', () => {
    it('returns the intent', () => {
      expect(getIntent('forgetful').label).toBe('Forgetful')
    })

    it('returns null for a user who never picked one', () => {
      expect(getIntent(null)).toBeNull()
      expect(getIntent(undefined)).toBeNull()
    })

    it('returns null for a key it does not know', () => {
      expect(getIntent('nonsense')).toBeNull()
    })
  })

  // The onboarding config composes identity + wizard behaviour. If that
  // merge drops a half, the wizard silently loses labels or routing.
  describe('INTENT_CONFIG composition', () => {
    it('keeps every intent identity from the shared source', () => {
      for (const key of INTENT_KEYS) {
        expect(INTENT_CONFIG[key].label).toBe(INTENTS[key].label)
        expect(INTENT_CONFIG[key].emoji).toBe(INTENTS[key].emoji)
        expect(INTENT_CONFIG[key].description).toBe(INTENTS[key].description)
      }
    })

    it('adds the wizard behaviour each onboarding consumer reads', () => {
      for (const key of INTENT_KEYS) {
        expect(INTENT_CONFIG[key]).toHaveProperty('previewLine')
        expect(INTENT_CONFIG[key]).toHaveProperty('completionRoute')
        expect(Array.isArray(INTENT_CONFIG[key].skipSteps)).toBe(true)
      }
    })

    it('preserves the intents that skip steps', () => {
      expect(INTENT_CONFIG.sick_plant.skipSteps).toEqual([4, 5])
      expect(INTENT_CONFIG.browsing.skipSteps).toEqual([5])
      expect(INTENT_CONFIG.forgetful.skipSteps).toEqual([])
    })
  })
})
