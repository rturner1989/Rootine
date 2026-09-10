import { describe, expect, it } from 'vitest'
import { formatLongDate } from '../../src/utils/dates'

describe('formatLongDate', () => {
  it('formats an ISO date in the reader locale', () => {
    const expected = new Date('2026-03-12').toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    expect(formatLongDate('2026-03-12')).toBe(expected)
  })

  it('returns null for missing input', () => {
    expect(formatLongDate(null)).toBeNull()
    expect(formatLongDate(undefined)).toBeNull()
    expect(formatLongDate('')).toBeNull()
  })

  it('returns null rather than "Invalid Date" for unparseable input', () => {
    expect(formatLongDate('not-a-date')).toBeNull()
  })
})
