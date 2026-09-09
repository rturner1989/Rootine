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

// Space::ICONS — app-validated inclusion list. DB column is nullable, but
// space_params always sends :icon and 2519/2519 real rows carry a valid
// member (0 nil, 0 blank, 0 out-of-list).
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
  icon: spaceIconSchema,
  category: spaceCategorySchema,
  light_level: lightLevelSchema,
  temperature_level: temperatureLevelSchema,
  humidity_level: humidityLevelSchema,
  archived_at: z.string().nullable(),
  plants_count: z.number(),
  created_at: z.string(),
})

export type Space = z.infer<typeof spaceSchema>
