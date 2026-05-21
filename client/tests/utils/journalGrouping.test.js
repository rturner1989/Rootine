import { describe, expect, it } from 'vitest'
import { groupEntriesByDay } from '../../src/utils/journalGrouping'

function isoAt(daysAgo, hours = 12, minutes = 0) {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  date.setHours(hours, minutes, 0, 0)
  return date.toISOString()
}

describe('groupEntriesByDay', () => {
  it('returns an empty array for empty input', () => {
    expect(groupEntriesByDay([])).toEqual([])
  })

  it('groups entries by their local date', () => {
    const entries = [
      { id: 'a', occurred_at: isoAt(2, 9, 0) },
      { id: 'b', occurred_at: isoAt(2, 17, 30) },
      { id: 'c', occurred_at: isoAt(0, 8, 0) },
    ]
    const groups = groupEntriesByDay(entries)

    expect(groups).toHaveLength(2)
    expect(groups[0].entries.map((entry) => entry.id)).toEqual(['a', 'b'])
    expect(groups[1].entries.map((entry) => entry.id)).toEqual(['c'])
  })

  it('labels today and yesterday with a relative word + absolute date', () => {
    const groups = groupEntriesByDay([
      { id: 'today', occurred_at: isoAt(0, 10) },
      { id: 'yesterday', occurred_at: isoAt(1, 10) },
    ])

    const relatives = groups.map((group) => group.relativeLabel)
    expect(relatives).toContain('Today')
    expect(relatives).toContain('Yesterday')
    // Absolute date sits alongside the relative word.
    expect(groups[0].dateLabel).toMatch(/[A-Za-z]/)
  })

  it('labels older days with a weekday relative word + day/month date', () => {
    const groups = groupEntriesByDay([{ id: 'old', occurred_at: isoAt(10, 10) }])

    expect(groups[0].relativeLabel).not.toBe('Today')
    expect(groups[0].relativeLabel).not.toBe('Yesterday')
    expect(groups[0].relativeLabel).toMatch(/[A-Za-z]/)
    expect(groups[0].dateLabel).toMatch(/[A-Za-z]/)
  })

  it('skips entries with no occurred_at', () => {
    const groups = groupEntriesByDay([
      { id: 'valid', occurred_at: isoAt(0, 10) },
      { id: 'missing', occurred_at: null },
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0].entries).toHaveLength(1)
  })
})
