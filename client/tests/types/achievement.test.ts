import { describe, expect, it } from 'vitest'
import { achievementsResponseSchema } from '../../src/types/achievement'
import achievementsIndexFixture from '../fixtures/api/achievements-index.json'
import achievementsUnseenFixture from '../fixtures/api/achievements-unseen.json'

// Both fixtures are real, populated responses — achievements-index.json
// from a user with 3 earned achievements, achievements-unseen.json from a
// different seeded user chosen specifically because they have an unseen
// splash-surface achievement (most seeded users don't).
describe('achievementsResponseSchema', () => {
  it('parses a real, populated achievements index', () => {
    expect(achievementsIndexFixture.achievements.length).toBeGreaterThan(0)
    expect(achievementsResponseSchema.safeParse(achievementsIndexFixture).success).toBe(true)
  })

  it('parses a real, populated unseen-splash queue', () => {
    expect(achievementsUnseenFixture.achievements.length).toBeGreaterThan(0)
    expect(achievementsResponseSchema.safeParse(achievementsUnseenFixture).success).toBe(true)
  })

  it('rejects an achievement missing emoji — Achievement#as_json always sets it', () => {
    const broken = {
      achievements: achievementsIndexFixture.achievements.map(({ emoji: _emoji, ...rest }) => rest),
    }
    expect(achievementsResponseSchema.safeParse(broken).success).toBe(false)
  })
})
