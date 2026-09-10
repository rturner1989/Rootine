import type { CalendarEvent, JournalKind, ScheduledCareItem, ScheduledCareKind } from '../types/journal'
import { isoDateKey } from './dateKey'

// Monday-start week, matching the mockup's Mon→Sun column order.
export const WEEK_STARTS_ON = 1

const DAYS_IN_WEEK = 7
const WEEKS_IN_GRID = 6
const GRID_CELLS = DAYS_IN_WEEK * WEEKS_IN_GRID

// Dot palette + render order. The legend and the dots in a cell read in
// this order so the calendar is internally consistent. Acquisition +
// achievement both surface as the sunshine "milestone" dot — the mockup's
// legend has no separate acquisition colour, and one milestone dot per day
// reads cleaner than two near-twins.
export const DOT_KINDS = ['water', 'feed', 'photo', 'milestone'] as const
export type DotKind = (typeof DOT_KINDS)[number]

// The kinds care is *scheduled* for (the rest are logged-only). Scheduled
// dots render hollow (planned) and overdue dots coral (missed); logged
// dots render filled (done). Mirrors types/journal.ts's scheduledCareKindSchema
// members — kept as a runtime array here for the .includes() check below.
export const CARE_KINDS: readonly ScheduledCareKind[] = ['water', 'feed']

const DOT_KIND_BY_EVENT_KIND: Record<JournalKind, DotKind> = {
  water: 'water',
  feed: 'feed',
  photo: 'photo',
  achievement: 'milestone',
  acquisition: 'milestone',
}

type ScheduledDotState = 'scheduled' | 'overdue'
export type CareDotVariant = 'logged' | ScheduledDotState
export type CalendarDot = { kind: DotKind; variant: CareDotVariant }

export type CalendarCell = {
  key: string
  date: Date
  dayNum: number
  isOutOfMonth: boolean
  isToday: boolean
  inOverdueTrail: boolean
  dots: CalendarDot[]
}

// day-key → ordered dot kinds logged that day. Deduped: three waterings on
// one day is one water dot (the calendar dots which KINDS occurred, not how
// many). Output order follows DOT_KINDS regardless of event order.
export function groupEventsByDay(events: CalendarEvent[] = []): Map<string, DotKind[]> {
  const kindsByDay = new Map<string, Set<DotKind>>()

  for (const event of events) {
    if (!event.occurred_at) continue

    const dotKind = DOT_KIND_BY_EVENT_KIND[event.kind]
    if (!dotKind) continue

    const key = isoDateKey(new Date(event.occurred_at))
    const kinds = kindsByDay.get(key) ?? new Set<DotKind>()
    kinds.add(dotKind)
    kindsByDay.set(key, kinds)
  }

  const ordered = new Map<string, DotKind[]>()
  for (const [key, kinds] of kindsByDay) {
    ordered.set(
      key,
      DOT_KINDS.filter((kind) => kinds.has(kind)),
    )
  }
  return ordered
}

// day-key → Map<kind, 'scheduled' | 'overdue'>. Server states 'scheduled'
// and 'due_today' both read as a hollow planned dot; 'overdue' wins for a
// kind when any plant is overdue that day (the urgent state surfaces).
export function groupScheduledByDay(scheduled: ScheduledCareItem[] = []): Map<string, Map<DotKind, ScheduledDotState>> {
  const byDay = new Map<string, Map<DotKind, ScheduledDotState>>()

  for (const item of scheduled) {
    if (!CARE_KINDS.includes(item.kind)) continue

    const kinds = byDay.get(item.date) ?? new Map<DotKind, ScheduledDotState>()
    const overdue = item.state === 'overdue' || kinds.get(item.kind) === 'overdue'
    kinds.set(item.kind, overdue ? 'overdue' : 'scheduled')
    byDay.set(item.date, kinds)
  }

  return byDay
}

// How many leading days from the previous month pad the first row, given
// which weekday the month opens on.
function leadingDays(year: number, month: number, weekStartsOn: number): number {
  const firstWeekday = new Date(year, month, 1).getDay()
  return (firstWeekday - weekStartsOn + DAYS_IN_WEEK) % DAYS_IN_WEEK
}

// The day-keys that sit on a red overdue trail — from each overdue entry's
// missed due date (overdue_since) up to, but not including, today. Today is
// the bright endpoint (it carries the dot + word), so it's excluded here.
function overdueTrailKeys(scheduled: ScheduledCareItem[], today: Date): Set<string> {
  const keys = new Set<string>()
  const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()

  for (const item of scheduled) {
    if (item.state !== 'overdue' || !item.overdue_since) continue

    for (
      const date = new Date(`${item.overdue_since}T00:00:00`);
      date.getTime() < todayTime;
      date.setDate(date.getDate() + 1)
    ) {
      keys.add(isoDateKey(date))
    }
  }
  return keys
}

// Per-cell dots in DOT_KINDS order. Logged wins per kind (done beats
// planned) — a watered-today cell shows a filled water dot, not also a
// "due" one. Otherwise water/feed fall back to their scheduled/overdue
// variant; photo/milestone are logged-only.
function cellDots(loggedKinds: DotKind[], scheduledKinds: Map<DotKind, ScheduledDotState>): CalendarDot[] {
  const dots: CalendarDot[] = []
  for (const kind of DOT_KINDS) {
    if (loggedKinds.includes(kind)) {
      dots.push({ kind, variant: 'logged' })
      continue
    }
    const variant = scheduledKinds.get(kind)
    if (variant) dots.push({ kind, variant })
  }
  return dots
}

// The visible grid is always 6×7. Each cell is interaction-ready — it
// carries its own date + flags + dots — so a future day-click, week-view
// slice, or schedule overlay reads cell data instead of recomputing it.
// `new Date(year, month, 1 - leading + offset)` leans on JS Date's overflow
// normalisation to roll cleanly across month/year boundaries (the day
// component can go negative or past month-end).
export function buildCalendarGrid(
  viewMonth: Date,
  { events = [], scheduled = [] }: { events?: CalendarEvent[]; scheduled?: ScheduledCareItem[] } = {},
  { today = new Date(), weekStartsOn = WEEK_STARTS_ON }: { today?: Date; weekStartsOn?: number } = {},
): CalendarCell[][] {
  const loggedByDay = groupEventsByDay(events)
  const scheduledByDay = groupScheduledByDay(scheduled)
  const trailKeys = overdueTrailKeys(scheduled, today)
  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const todayKey = isoDateKey(today)
  const offsetZero = 1 - leadingDays(year, month, weekStartsOn)

  const weeks: CalendarCell[][] = []
  for (let week = 0; week < WEEKS_IN_GRID; week++) {
    const days: CalendarCell[] = []
    for (let weekday = 0; weekday < DAYS_IN_WEEK; weekday++) {
      const cellDate = new Date(year, month, offsetZero + week * DAYS_IN_WEEK + weekday)
      const key = isoDateKey(cellDate)
      days.push({
        key,
        date: cellDate,
        dayNum: cellDate.getDate(),
        isOutOfMonth: cellDate.getMonth() !== month,
        isToday: key === todayKey,
        inOverdueTrail: trailKeys.has(key),
        dots: cellDots(loggedByDay.get(key) ?? [], scheduledByDay.get(key) ?? new Map()),
      })
    }
    weeks.push(days)
  }
  return weeks
}

// Inclusive day-key bounds of the visible 6×7 grid — what the calendar
// query asks the server for, so out-of-month cells get their dots too.
export function gridRange(
  viewMonth: Date,
  { weekStartsOn = WEEK_STARTS_ON }: { weekStartsOn?: number } = {},
): { from: string; to: string } {
  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const offsetZero = 1 - leadingDays(year, month, weekStartsOn)
  return {
    from: isoDateKey(new Date(year, month, offsetZero)),
    to: isoDateKey(new Date(year, month, offsetZero + GRID_CELLS - 1)),
  }
}

// First-of-month `delta` months away. Anchoring on day 1 sidesteps the
// "31 Jan + 1 month = 3 Mar" overflow trap.
export function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1)
}

export function addDays(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta)
}

// The week-start (Monday) of the week containing `date`.
export function startOfWeek(date: Date, weekStartsOn: number = WEEK_STARTS_ON): Date {
  const diff = (date.getDay() - weekStartsOn + DAYS_IN_WEEK) % DAYS_IN_WEEK
  return addDays(date, -diff)
}

// Inclusive day-key bounds of the week containing `date` — the week view's
// query window (mirrors gridRange for the month view).
export function weekRange(
  date: Date,
  { weekStartsOn = WEEK_STARTS_ON }: { weekStartsOn?: number } = {},
): { from: string; to: string } {
  const start = startOfWeek(date, weekStartsOn)
  return { from: isoDateKey(start), to: isoDateKey(addDays(start, DAYS_IN_WEEK - 1)) }
}

// Weekday header labels in column order. `format` maps to Intl weekday
// styles — 'short' (Mon) for desktop, 'narrow' (M) for mobile. Built from
// a known Sunday so the rotation is locale-correct, not hardcoded English.
export function weekdayLabels({
  weekStartsOn = WEEK_STARTS_ON,
  format = 'short',
  locale,
}: {
  weekStartsOn?: number
  format?: Intl.DateTimeFormatOptions['weekday']
  locale?: string
} = {}): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: format })
  const labels: string[] = []
  for (let i = 0; i < DAYS_IN_WEEK; i++) {
    const weekday = (weekStartsOn + i) % DAYS_IN_WEEK
    labels.push(formatter.format(new Date(2024, 0, 7 + weekday)))
  }
  return labels
}
