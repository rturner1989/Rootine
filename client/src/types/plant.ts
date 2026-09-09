import { z } from 'zod'
import { spaceSchema } from './space'
import { speciesSchema } from './species'

// Plant#water_status / #feed_status return Ruby symbols (serialised as
// strings) from the same member set, computed off different day thresholds
// (water: due_soon within 2 days, feed: within 3) — see plant.rb.
export const waterStatusSchema = z.enum(['overdue', 'due_today', 'due_soon', 'healthy', 'unknown'])
export const feedStatusSchema = waterStatusSchema

export type WaterStatus = z.infer<typeof waterStatusSchema>
export type FeedStatus = z.infer<typeof feedStatusSchema>

export const plantSchema = z.object({
  id: z.number(),
  nickname: z.string(),
  notes: z.string().nullable(),
  space_id: z.number(),
  space: spaceSchema,
  species: speciesSchema.nullable(),
  calculated_watering_days: z.number().nullable(),
  calculated_feeding_days: z.number().nullable(),
  water_status: waterStatusSchema,
  feed_status: feedStatusSchema,
  days_until_water: z.number().nullable(),
  days_until_feed: z.number().nullable(),
  last_watered_at: z.string().nullable(),
  last_fed_at: z.string().nullable(),
  acquired_at: z.string().nullable(),
  created_at: z.string(),
})

export type Plant = z.infer<typeof plantSchema>
