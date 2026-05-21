import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMonths,
  buildCalendarGrid,
  gridRange,
  groupEventsByDay,
  groupScheduledByDay,
  startOfWeek,
  weekdayLabels,
  weekRange,
} from '../../src/utils/calendarGrid'

const flat = (weeks) => weeks.flat()
const cellAt = (weeks, key) => flat(weeks).find((cell) => cell.key === key)

describe('buildCalendarGrid', () => {
  it('always returns a 6×7 grid', () => {
    const weeks = buildCalendarGrid(new Date(2025, 8, 1)) // September 2025
    expect(weeks).toHaveLength(6)
    expect(weeks.every((week) => week.length === 7)).toBe(true)
  })

  it('a Monday-opening month has no leading padding', () => {
    const weeks = buildCalendarGrid(new Date(2025, 8, 1)) // 1 Sep 2025 is a Monday
    expect(weeks[0][0]).toMatchObject({ dayNum: 1, isOutOfMonth: false })
  })

  it('a Sunday-opening month pads six leading days from the previous month', () => {
    const firstRow = buildCalendarGrid(new Date(2025, 5, 1))[0] // 1 Jun 2025 is a Sunday
    expect(firstRow.filter((cell) => cell.isOutOfMonth)).toHaveLength(6)
    expect(firstRow[0].dayNum).toBe(26) // Mon 26 May
    expect(firstRow[6]).toMatchObject({ dayNum: 1, isOutOfMonth: false }) // 1 Jun in the Sunday column
  })

  it('pads trailing days into the next month to fill the final row', () => {
    const weeks = buildCalendarGrid(new Date(2025, 5, 1)) // June 2025: 6 leading + 30 days spills to row 6
    const trailing = flat(weeks).filter((cell) => cell.isOutOfMonth && cell.dayNum < 15)
    expect(trailing[0].dayNum).toBe(1) // 1 July
    expect(weeks[5][6].isOutOfMonth).toBe(true)
  })

  it('flags exactly one cell as today when today falls in the grid', () => {
    const weeks = buildCalendarGrid(new Date(2025, 8, 1), [], { today: new Date(2025, 8, 15) })
    const todayCells = flat(weeks).filter((cell) => cell.isToday)
    expect(todayCells).toHaveLength(1)
    expect(todayCells[0]).toMatchObject({ dayNum: 15, isOutOfMonth: false })
  })

  it('attaches deduped logged dots in DOT_KINDS order, not event order', () => {
    const events = [
      { occurred_at: '2025-09-10T09:00:00', kind: 'water' },
      { occurred_at: '2025-09-10T18:00:00', kind: 'water' }, // duplicate → one dot
      { occurred_at: '2025-09-10T12:00:00', kind: 'photo' },
      { occurred_at: '2025-09-10T20:00:00', kind: 'feed' },
    ]
    const cell = cellAt(buildCalendarGrid(new Date(2025, 8, 1), { events }), '2025-09-10')
    expect(cell.dots).toEqual([
      { kind: 'water', variant: 'logged' },
      { kind: 'feed', variant: 'logged' },
      { kind: 'photo', variant: 'logged' },
    ])
  })

  it('collapses achievement and acquisition into one milestone dot', () => {
    const events = [
      { occurred_at: '2025-09-05T09:00:00', kind: 'achievement' },
      { occurred_at: '2025-09-05T10:00:00', kind: 'acquisition' },
    ]
    const cell = cellAt(buildCalendarGrid(new Date(2025, 8, 1), { events }), '2025-09-05')
    expect(cell.dots).toEqual([{ kind: 'milestone', variant: 'logged' }])
  })

  it('renders scheduled care as hollow dots and overdue as overdue dots', () => {
    const scheduled = [
      { date: '2025-09-12', kind: 'water', state: 'scheduled' },
      { date: '2025-09-12', kind: 'feed', state: 'due_today' },
      { date: '2025-09-08', kind: 'water', state: 'overdue' },
    ]
    const weeks = buildCalendarGrid(new Date(2025, 8, 1), { scheduled })
    expect(cellAt(weeks, '2025-09-12').dots).toEqual([
      { kind: 'water', variant: 'scheduled' },
      { kind: 'feed', variant: 'scheduled' }, // due_today reads as planned
    ])
    expect(cellAt(weeks, '2025-09-08').dots).toEqual([{ kind: 'water', variant: 'overdue' }])
  })

  it('tints a red overdue trail from the missed day up to (not including) today', () => {
    const scheduled = [{ date: '2025-09-15', kind: 'water', state: 'overdue', overdue_since: '2025-09-12' }]
    const weeks = buildCalendarGrid(new Date(2025, 8, 1), { scheduled }, { today: new Date(2025, 8, 15) })

    expect(cellAt(weeks, '2025-09-11').inOverdueTrail).toBe(false) // before the missed day
    expect(cellAt(weeks, '2025-09-12').inOverdueTrail).toBe(true)
    expect(cellAt(weeks, '2025-09-14').inOverdueTrail).toBe(true)
    expect(cellAt(weeks, '2025-09-15').inOverdueTrail).toBe(false) // today is the endpoint, not trail
    expect(cellAt(weeks, '2025-09-15').dots).toEqual([{ kind: 'water', variant: 'overdue' }])
  })

  it('lets a logged dot win over a scheduled one of the same kind that day', () => {
    const events = [{ occurred_at: '2025-09-15T09:00:00', kind: 'water' }]
    const scheduled = [{ date: '2025-09-15', kind: 'water', state: 'due_today' }]
    const cell = cellAt(buildCalendarGrid(new Date(2025, 8, 1), { events, scheduled }), '2025-09-15')
    expect(cell.dots).toEqual([{ kind: 'water', variant: 'logged' }])
  })
})

describe('groupEventsByDay', () => {
  it('skips events with no timestamp or an unrecognised kind', () => {
    const map = groupEventsByDay([
      { occurred_at: null, kind: 'water' },
      { occurred_at: '2025-09-01T09:00:00', kind: 'mystery' },
      { occurred_at: '2025-09-01T09:00:00', kind: 'water' },
    ])
    expect(map.get('2025-09-01')).toEqual(['water'])
  })
})

describe('groupScheduledByDay', () => {
  it('overdue wins over scheduled for the same kind on a day', () => {
    const byDay = groupScheduledByDay([
      { date: '2025-09-10', kind: 'water', state: 'scheduled' },
      { date: '2025-09-10', kind: 'water', state: 'overdue' }, // a second plant, overdue
    ])
    expect(byDay.get('2025-09-10').get('water')).toBe('overdue')
  })

  it('ignores kinds that are not scheduleable care', () => {
    const byDay = groupScheduledByDay([{ date: '2025-09-10', kind: 'photo', state: 'scheduled' }])
    expect(byDay.has('2025-09-10')).toBe(false)
  })
})

describe('gridRange', () => {
  it('spans the first and last visible cell keys', () => {
    const viewMonth = new Date(2025, 5, 1)
    const weeks = buildCalendarGrid(viewMonth)
    expect(gridRange(viewMonth)).toEqual({ from: weeks[0][0].key, to: weeks[5][6].key })
  })
})

describe('week helpers', () => {
  it('startOfWeek returns the Monday of the containing week', () => {
    expect(startOfWeek(new Date(2025, 8, 17))).toEqual(new Date(2025, 8, 15)) // Wed → Mon 15 Sep
    expect(startOfWeek(new Date(2025, 8, 15))).toEqual(new Date(2025, 8, 15)) // Monday → itself
  })

  it('weekRange spans Monday to Sunday', () => {
    expect(weekRange(new Date(2025, 8, 17))).toEqual({ from: '2025-09-15', to: '2025-09-21' })
  })

  it('addDays crosses month boundaries', () => {
    expect(addDays(new Date(2025, 8, 28), 7)).toEqual(new Date(2025, 9, 5)) // 28 Sep + 7 = 5 Oct
  })
})

describe('addMonths', () => {
  it('rolls forward across the year boundary to the first of the month', () => {
    expect(addMonths(new Date(2025, 11, 17), 1)).toEqual(new Date(2026, 0, 1))
  })

  it('rolls backward across the year boundary', () => {
    expect(addMonths(new Date(2025, 0, 31), -1)).toEqual(new Date(2024, 11, 1))
  })
})

describe('weekdayLabels', () => {
  it('returns Monday-first short labels', () => {
    expect(weekdayLabels({ locale: 'en-US' })).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
  })

  it('supports narrow labels for the mobile header', () => {
    expect(weekdayLabels({ locale: 'en-US', format: 'narrow' })).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S'])
  })
})
