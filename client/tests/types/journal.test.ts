import { describe, expect, it } from 'vitest'
import { journalCalendarResponseSchema, journalIndexResponseSchema } from '../../src/types/journal'
import journalCalendarFixture from '../fixtures/api/journal-calendar.json'
import journalIndexFixture from '../fixtures/api/journal-index.json'

// journal-index.json is a real first page (30 entries, the default limit)
// with a non-null next_cursor — more entries exist for this user, so the
// pagination branch that actually matters is exercised, not just the
// empty/last-page case.
describe('journalIndexResponseSchema', () => {
  it('parses a real first page with a non-null next_cursor', () => {
    expect(journalIndexFixture.next_cursor).not.toBeNull()
    expect(journalIndexResponseSchema.safeParse(journalIndexFixture).success).toBe(true)
  })

  it('rejects when summary is missing — JournalController#index always ships it alongside entries', () => {
    const { summary: _summary, ...withoutSummary } = journalIndexFixture
    expect(journalIndexResponseSchema.safeParse(withoutSummary).success).toBe(false)
  })
})

// journal-calendar.json is a real window chosen so both `scheduled` states
// (overdue with a populated overdue_since, and scheduled with a null one)
// appear — not just the trivial empty-scheduled case.
describe('journalCalendarResponseSchema', () => {
  it('parses a real window with both scheduled and overdue entries', () => {
    const states = new Set(journalCalendarFixture.scheduled.map((entry) => entry.state))
    expect(states.has('scheduled')).toBe(true)
    expect(states.has('overdue')).toBe(true)
    expect(journalCalendarResponseSchema.safeParse(journalCalendarFixture).success).toBe(true)
  })

  it('rejects a scheduled entry missing plant_id — CareSchedule#entry always sets it', () => {
    const broken = {
      ...journalCalendarFixture,
      scheduled: journalCalendarFixture.scheduled.map(({ plant_id: _plantId, ...rest }) => rest),
    }
    expect(journalCalendarResponseSchema.safeParse(broken).success).toBe(false)
  })
})
