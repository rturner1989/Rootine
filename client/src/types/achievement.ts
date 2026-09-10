import { z } from 'zod'

export const achievementSchema = z.object({
  id: z.number(),
  kind: z.string(),
  label: z.string(),
  emoji: z.string(),
  earned_at: z.string(),
  seen_at: z.string().nullable(),
  // jsonb, free-form — AchievementCatalogue metadata_for varies per kind.
  metadata: z.record(z.string(), z.unknown()),
})

export type Achievement = z.infer<typeof achievementSchema>

// AchievementsController#index / Achievements::UnseenController#show —
// both wrap the list in the same { achievements } envelope.
export const achievementsResponseSchema = z.object({
  achievements: z.array(achievementSchema),
})

export type AchievementsResponse = z.infer<typeof achievementsResponseSchema>

// AchievementsController#update — mark-seen response.
export const achievementResponseSchema = z.object({
  achievement: achievementSchema,
})

export type AchievementResponse = z.infer<typeof achievementResponseSchema>
