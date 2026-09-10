import { z } from 'zod'
import { personalitySchema } from './species'

// JournalStream::KINDS
export const journalKindSchema = z.enum(['water', 'feed', 'photo', 'achievement', 'acquisition'])
export type JournalKind = z.infer<typeof journalKindSchema>

// JournalStream#plant_payload — a slim plant projection shared by every
// entry kind. species is null when the plant has none linked.
const journalPlantSchema = z.object({
  id: z.number(),
  nickname: z.string(),
  species: z
    .object({
      id: z.number(),
      common_name: z.string(),
      personality: personalitySchema,
    })
    .nullable(),
})

const careJournalEntryBaseSchema = z.object({
  id: z.string(),
  occurred_at: z.string(),
  plant: journalPlantSchema.nullable(),
  notes: z.string().nullable(),
})

// Entry shape varies by kind (notes for care, caption/image_url for photo,
// label/emoji for achievement) — a discriminated union matches the real
// per-kind builders in journal_stream.rb instead of one loosely-typed shape.
export const journalEntrySchema = z.discriminatedUnion('kind', [
  careJournalEntryBaseSchema.extend({ kind: z.literal('water') }),
  careJournalEntryBaseSchema.extend({ kind: z.literal('feed') }),
  z.object({
    kind: z.literal('photo'),
    id: z.string(),
    occurred_at: z.string(),
    plant: journalPlantSchema.nullable(),
    caption: z.string().nullable(),
    image_url: z.string().nullable(),
  }),
  z.object({
    kind: z.literal('acquisition'),
    id: z.string(),
    occurred_at: z.string(),
    plant: journalPlantSchema.nullable(),
  }),
  z.object({
    kind: z.literal('achievement'),
    id: z.string(),
    occurred_at: z.string(),
    label: z.string(),
    emoji: z.string(),
    plant: journalPlantSchema.nullable(),
  }),
])

export type JournalEntry = z.infer<typeof journalEntrySchema>

// JournalStream#calendar_events — a compact { occurred_at, kind } projection
// for the Calendar tab's per-day dots, distinct from the full journalEntrySchema
// (no id/plant/notes — see journal_stream.rb#calendar_events).
export const calendarEventSchema = z.object({
  occurred_at: z.string(),
  kind: journalKindSchema,
})

export type CalendarEvent = z.infer<typeof calendarEventSchema>

// CareSchedule::CARE_KINDS — only water/feed are schedulable; photo/
// achievement/acquisition are logged-only and never appear here.
export const scheduledCareKindSchema = z.enum(['water', 'feed'])
export type ScheduledCareKind = z.infer<typeof scheduledCareKindSchema>

// CareSchedule#entry — the forward-looking layer beside JournalStream's
// logged events. state comes from Plant#overdue_due_dates /
// #upcoming_due_dates (plant.rb); overdue_since is only set on the
// 'overdue' branch, so it's nullable rather than optional.
export const scheduledCareItemSchema = z.object({
  date: z.string(),
  kind: scheduledCareKindSchema,
  state: z.enum(['scheduled', 'due_today', 'overdue']),
  overdue_since: z.string().nullable(),
  plant_id: z.number(),
  plant_nickname: z.string(),
})

export type ScheduledCareItem = z.infer<typeof scheduledCareItemSchema>

// JournalStream#summary — whole-set totals, ignoring pagination.
const journalCalendarTopPlantSchema = z.object({
  id: z.number(),
  nickname: z.string(),
  image_url: z.string().nullable(),
  count: z.number(),
})

export const journalCalendarSummarySchema = z.object({
  entry_count: z.number(),
  plant_count: z.number(),
  kind_counts: z.object({
    water: z.number(),
    feed: z.number(),
    photo: z.number(),
    achievement: z.number(),
    acquisition: z.number(),
  }),
  top_plants: z.array(journalCalendarTopPlantSchema),
  streak: z.object({ days: z.number() }),
})

export type JournalCalendarSummary = z.infer<typeof journalCalendarSummarySchema>

// Api::V1::Journal::CalendarController#show — the { events, scheduled,
// summary } envelope actually rendered.
export const journalCalendarResponseSchema = z.object({
  events: z.array(calendarEventSchema),
  scheduled: z.array(scheduledCareItemSchema),
  summary: journalCalendarSummarySchema,
})

export type JournalCalendarResponse = z.infer<typeof journalCalendarResponseSchema>

// JournalController#index — the paginated Timeline feed. next_cursor is
// null once a page comes back shorter than the requested limit (see
// JournalStream#next_cursor); summary is whole-set totals, unaffected by
// pagination, and re-shipped on every page rather than only the first.
export const journalIndexResponseSchema = z.object({
  entries: z.array(journalEntrySchema),
  next_cursor: z.string().nullable(),
  summary: journalCalendarSummarySchema,
})

export type JournalIndexResponse = z.infer<typeof journalIndexResponseSchema>
