import { z } from 'zod'
import { humidityLevelSchema, lightLevelSchema, spaceSchema, temperatureLevelSchema } from './space'

export const personalitySchema = z.enum(['dramatic', 'prickly', 'chill', 'needy', 'stoic'])
export type Personality = z.infer<typeof personalitySchema>

// Species#community_stats — anonymous, cross-user aggregates. Present only
// when Species#as_json is called with community: true, and even then can be
// null (grower_count below Species::COMMUNITY_MIN_GROWERS).
const speciesCommunityStatsSchema = z.object({
  grower_count: z.number(),
  median_watering_days: z.number().nullable(),
  typical_light: lightLevelSchema.nullable(),
  kept_on_schedule_pct: z.number().nullable(),
})

export type SpeciesCommunityStats = z.infer<typeof speciesCommunityStatsSchema>

// Space.level_options — the same three enums Space itself validates
// light_level/temperature_level/humidity_level against.
const speciesPlantLevelsSchema = z.object({
  light: z.array(lightLevelSchema),
  temperature: z.array(temperatureLevelSchema),
  humidity: z.array(humidityLevelSchema),
})

export const speciesSchema = z.object({
  id: z.number(),
  common_name: z.string(),
  scientific_name: z.string().nullable(),
  watering_frequency_days: z.number(),
  feeding_frequency_days: z.number().nullable(),
  // Perenual's own vocabulary ('bright_indirect', 'low_to_bright', ...) —
  // distinct from Space's light_level enum, not a fixed member set.
  light_requirement: z.string().nullable(),
  humidity_preference: z.string().nullable(),
  // BigDecimal columns: Rails' default as_json renders them as strings
  // ("18.0"), not numbers, to avoid float precision loss.
  temperature_min: z.string().nullable(),
  temperature_max: z.string().nullable(),
  toxicity: z.string().nullable(),
  // Tri-state: true (safe), false (toxic), null (unknown) — never a safety
  // claim when null. See Species#pet_safe.
  pet_safe: z.boolean().nullable(),
  difficulty: z.string().nullable(),
  growth_rate: z.string().nullable(),
  personality: personalitySchema,
  popular: z.boolean(),
  description: z.string().nullable(),
  care_tips: z.string().nullable(),
  image_url: z.string().nullable(),
  suggested_light_level: lightLevelSchema,
  suggested_temperature_level: temperatureLevelSchema,
  suggested_humidity_level: humidityLevelSchema,
  plant_levels: speciesPlantLevelsSchema,
  community: speciesCommunityStatsSchema.nullable().optional(),
})

export type Species = z.infer<typeof speciesSchema>

// SpeciesSearchResult — Perenual search results not yet cached locally.
// #as_json sets id: nil unconditionally, so this is z.null(), not a
// nullable number.
export const speciesSearchResultSchema = z.object({
  id: z.null(),
  perenual_id: z.number(),
  common_name: z.string().nullable(),
  scientific_name: z.string().nullable(),
  image_url: z.string().nullable(),
  source: z.literal('perenual'),
})

export type SpeciesSearchResult = z.infer<typeof speciesSearchResultSchema>

// SpeciesController#index text-search mode (`?q=`) — local catalogue
// matches (full speciesSchema records) interleaved with not-yet-cached
// Perenual results (speciesSearchResultSchema), per Species.search_with_api.
export const speciesIndexResultSchema = z.union([speciesSchema, speciesSearchResultSchema])

export type SpeciesIndexResult = z.infer<typeof speciesIndexResultSchema>

// Species.browse_facets — chip-badge counts over the whole local
// catalogue. Keys are grouped-by values (difficulty/suggested_light_level),
// including Ruby's nil key rendering as "" — z.record's string keys cover
// that without a separate optional-key case.
export const speciesFacetsSchema = z.object({
  pet_safe: z.number(),
  difficulty: z.record(z.string(), z.number()),
  light: z.record(z.string(), z.number()),
})

export type SpeciesFacets = z.infer<typeof speciesFacetsSchema>

// SpeciesController#browse_payload — the Encyclopedia grid's filtered mode.
export const speciesBrowsePayloadSchema = z.object({
  species: z.array(speciesSchema),
  facets: speciesFacetsSchema,
})

export type SpeciesBrowsePayload = z.infer<typeof speciesBrowsePayloadSchema>

// Species.browse_grouped_by_spaces — one group per active space, species
// ranked within each by community grower count.
const speciesGroupSchema = z.object({
  space: spaceSchema,
  species: z.array(speciesSchema),
})

// SpeciesController#grouped_payload — the Encyclopedia "By space" view.
export const speciesGroupedPayloadSchema = z.object({
  groups: z.array(speciesGroupSchema),
})

export type SpeciesGroupedPayload = z.infer<typeof speciesGroupedPayloadSchema>
