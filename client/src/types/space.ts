import { z } from 'zod'

export const lightLevelSchema = z.enum(['low', 'medium', 'bright'])
export const temperatureLevelSchema = z.enum(['cool', 'average', 'warm'])
export const humidityLevelSchema = z.enum(['dry', 'average', 'humid'])

export type LightLevel = z.infer<typeof lightLevelSchema>
export type TemperatureLevel = z.infer<typeof temperatureLevelSchema>
export type HumidityLevel = z.infer<typeof humidityLevelSchema>

// Space::CATEGORY_LABELS.keys — Rails enum, not-null column. Every real
// space row is 'indoor' or 'outdoor'; no nil/blank observed in 2519 rows.
export const spaceCategorySchema = z.enum(['indoor', 'outdoor'])
export type SpaceCategory = z.infer<typeof spaceCategorySchema>

// Space::ICONS — app-validated inclusion list.
export const spaceIconSchema = z.enum([
  'couch',
  'kitchen',
  'bed',
  'bath',
  'desk',
  'hallway',
  'study',
  'conservatory',
  'patio',
  'balcony',
  'garden_bed',
  'greenhouse',
])
export type SpaceIcon = z.infer<typeof spaceIconSchema>

export const spaceSchema = z.object({
  id: z.number(),
  name: z.string(),
  // space.rb: `validates :icon, inclusion: { in: ICONS }, allow_blank: true`
  // — a deliberate contract, not an oversight (reads like the column
  // predates icons being mandatory). allow_blank accepts both nil and ''
  // for validation, and nothing normalizes '' to nil on write, so both are
  // real possible values regardless of what today's rows hold.
  icon: z.union([spaceIconSchema, z.literal('')]).nullable(),
  category: spaceCategorySchema,
  light_level: lightLevelSchema,
  temperature_level: temperatureLevelSchema,
  humidity_level: humidityLevelSchema,
  archived_at: z.string().nullable(),
  plants_count: z.number(),
  created_at: z.string(),
})

export type Space = z.infer<typeof spaceSchema>
