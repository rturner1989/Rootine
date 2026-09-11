import { z } from 'zod'

export const careTypeSchema = z.enum(['watering', 'feeding'])
export type CareType = z.infer<typeof careTypeSchema>

export const careLogSchema = z.object({
  id: z.number(),
  care_type: careTypeSchema,
  performed_at: z.string(),
  notes: z.string().nullable(),
  created_at: z.string(),
})

export type CareLog = z.infer<typeof careLogSchema>
