import { describe, expect, it } from 'vitest'
import { DOT_FILL, DOT_LABEL, DOT_RING, dotClass } from '../../src/utils/careDots'

describe('careDots', () => {
  it('maps water + feed to the canonical fill colours', () => {
    expect(DOT_FILL.water).toBe('bg-water')
    expect(DOT_FILL.feed).toBe('bg-leaf')
  })

  it('maps water + feed to the canonical ring colours', () => {
    expect(DOT_RING.water).toBe('border-water')
    expect(DOT_RING.feed).toBe('border-leaf')
  })

  it('exposes human labels', () => {
    expect(DOT_LABEL.water).toBe('Water')
    expect(DOT_LABEL.feed).toBe('Feed')
  })

  describe('dotClass', () => {
    it('logged → filled dot in the kind colour', () => {
      const cls = dotClass({ kind: 'water', variant: 'logged' })
      expect(cls).toContain('bg-water')
      expect(cls).toContain('rounded-full')
    })

    it('scheduled → hollow ring in the kind colour', () => {
      const cls = dotClass({ kind: 'feed', variant: 'scheduled' })
      expect(cls).toContain('border-leaf')
      expect(cls).toMatch(/border-\[/)
    })

    it('overdue → coral pulse regardless of kind', () => {
      const cls = dotClass({ kind: 'water', variant: 'overdue' })
      expect(cls).toContain('bg-coral-deep')
      expect(cls).toContain('cal-dot-overdue')
    })
  })
})
