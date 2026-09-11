import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { spacePresetSchema } from '../../src/types/space'
import spacePresetsFixture from '../fixtures/api/space-presets.json'

// Space::PRESETS is a static constant, so this fixture is identical to
// every real GET /api/v1/spaces/presets response.
describe('spacePresetSchema', () => {
  it('parses the real presets list', () => {
    expect(z.array(spacePresetSchema).safeParse(spacePresetsFixture).success).toBe(true)
  })

  it('rejects a preset with an icon outside Space::ICONS', () => {
    const broken = { ...spacePresetsFixture[0], icon: 'not_a_real_icon' }
    expect(spacePresetSchema.safeParse(broken).success).toBe(false)
  })
})
