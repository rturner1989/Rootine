import { describe, expect, it } from 'vitest'
import { groupEntriesByDay } from '../../src/utils/journalGrouping'
import type { JournalEntry } from '../../src/types/journal'

function isoAt(daysAgo: number, hours = 12, minutes = 0): string {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  date.setHours(hours, minutes, 0, 0)
  return date.toISOString()
}

// groupEntriesByDay only reads id/occurred_at off each entry — the 'water'
// kind (and the plant/notes fields it drags along) is irrelevant to what
// these tests exercise, so a minimal fixture stands in for every entry kind.
function waterEntry(id: string, occurredAt: string): JournalEntry {
  return { kind: 'water', id, occurred_at: occurredAt, plant: null, notes: null }
}

describe('groupEntriesByDay', () => {
  it('returns an empty array for empty input', () => {
    expect(groupEntriesByDay([])).toEqual([])
  })

  it('groups entries by their local date', () => {
    const entries = [
      waterEntry('a', isoAt(2, 9, 0)),
      waterEntry('b', isoAt(2, 17, 30)),
      waterEntry('c', isoAt(0, 8, 0)),
    ]
    const groups = groupEntriesByDay(entries)

    expect(groups).toHaveLength(2)
    expect(groups[0].entries.map((entry) => entry.id)).toEqual(['a', 'b'])
    expect(groups[1].entries.map((entry) => entry.id)).toEqual(['c'])
  })

  it('labels today and yesterday with a relative word + absolute date', () => {
    const groups = groupEntriesByDay([waterEntry('today', isoAt(0, 10)), waterEntry('yesterday', isoAt(1, 10))])

    const relatives = groups.map((group) => group.relativeLabel)
    expect(relatives).toContain('Today')
    expect(relatives).toContain('Yesterday')
    // Absolute date sits alongside the relative word.
    expect(groups[0].dateLabel).toMatch(/[A-Za-z]/)
  })

  it('labels older days with a weekday relative word + day/month date', () => {
    const groups = groupEntriesByDay([waterEntry('old', isoAt(10, 10))])

    expect(groups[0].relativeLabel).not.toBe('Today')
    expect(groups[0].relativeLabel).not.toBe('Yesterday')
    expect(groups[0].relativeLabel).toMatch(/[A-Za-z]/)
    expect(groups[0].dateLabel).toMatch(/[A-Za-z]/)
  })

  it('skips entries with no occurred_at', () => {
    const groups = groupEntriesByDay([
      waterEntry('valid', isoAt(0, 10)),
      // occurred_at: null exercises the runtime guard for malformed/legacy
      // data — the schema-derived type requires a string, so this needs an
      // unknown-mediated cast to construct.
      { kind: 'water', id: 'missing', occurred_at: null, plant: null, notes: null } as unknown as JournalEntry,
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0].entries).toHaveLength(1)
  })
})
