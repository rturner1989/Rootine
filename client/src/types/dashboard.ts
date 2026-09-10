import { z } from 'zod'
import { scheduledCareKindSchema } from './journal'
import { personalitySchema } from './species'
import { plantSchema } from './plant'

// Plant#build_task — the Today rituals list. Distinct from
// CareSchedule#entry (scheduledCareItemSchema in types/journal.ts): this is
// the "what's due right now" list (only overdue/due_today, never
// scheduled/due_soon), carries a display label, and has a string `id` for
// list keys instead of a plant_id + date composite.
const dashboardTaskSchema = z.object({
  id: z.string(),
  kind: scheduledCareKindSchema,
  plant_id: z.number(),
  plant_nickname: z.string(),
  personality: personalitySchema.nullable(),
  due_on: z.string(),
  due_state: z.enum(['overdue', 'due_today']),
  due_label: z.string(),
  target_date: z.string(),
})

const dashboardStreakSchema = z.object({
  current: z.number(),
  longest: z.number(),
  care_current: z.number(),
  care_longest: z.number(),
})

const dashboardStatsSchema = z.object({
  total_plants: z.number(),
  total_spaces: z.number(),
  vitality_percent: z.number(),
})

// DashboardController#tasks_by_day_for_week — one entry per day of the
// visible week, keyed by ISO date string.
const dashboardTasksByDaySchema = z.record(z.string(), z.object({ water: z.number(), feed: z.number() }))

// Api::V1::DashboardController#show — Today's aggregate payload.
export const dashboardResponseSchema = z.object({
  plants_needing_water: z.array(plantSchema),
  plants_needing_feeding: z.array(plantSchema),
  upcoming_care: z.array(plantSchema),
  tasks: z.array(dashboardTaskSchema),
  tasks_by_day: dashboardTasksByDaySchema,
  streak: dashboardStreakSchema,
  stats: dashboardStatsSchema,
})

export type DashboardResponse = z.infer<typeof dashboardResponseSchema>
