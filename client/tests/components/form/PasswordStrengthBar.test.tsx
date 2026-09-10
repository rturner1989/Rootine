import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PasswordStrengthBar from '../../../src/components/form/PasswordStrengthBar'

// The colour mapping mirrors STRENGTH_CLASSES in usePasswordStrength.js:
//   1 → coral, 2 → sunshine, 3 → leaf, 4 → emerald
// Tests reference the meeting criteria so the intent stays readable even
// when the underlying scoring rules evolve.
describe('PasswordStrengthBar', () => {
  describe('empty / unfilled state', () => {
    it('renders nothing for an empty password (avoids flashing on focus before typing)', () => {
      const { container } = render(<PasswordStrengthBar password="" />)
      expect(container).toBeEmptyDOMElement()
    })

    it('renders nothing for a too-short password (no criteria met)', () => {
      const { container } = render(<PasswordStrengthBar password="abc" />)
      expect(container).toBeEmptyDOMElement()
    })
  })

  describe('layout', () => {
    it('renders four equal-width segments in a row', () => {
      const { container } = render(<PasswordStrengthBar password="abcdefgh" />)
      const segments = container.querySelectorAll('.flex-1')
      expect(segments).toHaveLength(4)
    })
  })

  describe('strength → fill count', () => {
    it('fills 1 segment for a weak password (length only — coral)', () => {
      const { container } = render(<PasswordStrengthBar password="abcdefgh" />)
      const segments = container.querySelectorAll('.flex-1')
      expect(segments[0]).toHaveClass('bg-coral')
      expect(segments[1]).toHaveClass('bg-mint')
      expect(segments[2]).toHaveClass('bg-mint')
      expect(segments[3]).toHaveClass('bg-mint')
    })

    it('fills 2 segments for a fair password (length + mixed case — sunshine)', () => {
      const { container } = render(<PasswordStrengthBar password="abcDefgh" />)
      const segments = container.querySelectorAll('.flex-1')
      expect(segments[0]).toHaveClass('bg-sunshine')
      expect(segments[1]).toHaveClass('bg-sunshine')
      expect(segments[2]).toHaveClass('bg-mint')
      expect(segments[3]).toHaveClass('bg-mint')
    })

    it('fills 3 segments for a good password (length + case + digit — leaf)', () => {
      const { container } = render(<PasswordStrengthBar password="abcDefg1" />)
      const segments = container.querySelectorAll('.flex-1')
      expect(segments[0]).toHaveClass('bg-leaf')
      expect(segments[1]).toHaveClass('bg-leaf')
      expect(segments[2]).toHaveClass('bg-leaf')
      expect(segments[3]).toHaveClass('bg-mint')
    })

    it('fills all 4 segments for a strong password (all criteria — emerald)', () => {
      const { container } = render(<PasswordStrengthBar password="abcDefg1!" />)
      const segments = container.querySelectorAll('.flex-1')
      expect(segments[0]).toHaveClass('bg-emerald')
      expect(segments[1]).toHaveClass('bg-emerald')
      expect(segments[2]).toHaveClass('bg-emerald')
      expect(segments[3]).toHaveClass('bg-emerald')
    })
  })
})
