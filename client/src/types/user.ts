import { z } from 'zod'

// User::USER_INTENT_LABELS.keys — Rails enum, validate: { allow_nil: true }.
// nil means "hasn't picked yet"; confirmed nullable against real data.
export const onboardingIntentSchema = z.enum(['forgetful', 'just_starting', 'sick_plant', 'browsing'])
export type OnboardingIntent = z.infer<typeof onboardingIntentSchema>

export const userStatsSchema = z.object({
  care_streak_days: z.number(),
  login_streak_days: z.number(),
  plants_count: z.number(),
  care_logs_count: z.number(),
  vitality_percent: z.number(),
})

export type UserStats = z.infer<typeof userStatsSchema>

export const userSchema = z.object({
  id: z.number(),
  email: z.string(),
  name: z.string(),
  // Nullable column (default "UTC", no NOT NULL constraint).
  timezone: z.string().nullable(),
  onboarded: z.boolean(),
  onboarding_intent: onboardingIntentSchema.nullable(),
  onboarding_step_reached: z.number(),
  avatar_url: z.string().nullable(),
  // Model calls &.to_f on the decimal columns, so these are numbers (not
  // the BigDecimal-as-string case Species#as_json hits).
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  location_label: z.string().nullable(),
  notify_care_reminders: z.boolean(),
  notify_achievements: z.boolean(),
  joined_on: z.string(),
  // Opt-in — User#as_json only walks #stats when options[:stats] is truthy.
  stats: userStatsSchema.optional(),
})

export type User = z.infer<typeof userSchema>
