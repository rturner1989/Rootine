import { z } from 'zod'

export const plantPhotoSchema = z.object({
  id: z.number(),
  caption: z.string().nullable(),
  taken_at: z.string(),
  // Nil when no image is attached — see PlantPhoto#image_url.
  image_url: z.string().nullable(),
  created_at: z.string(),
})

export type PlantPhoto = z.infer<typeof plantPhotoSchema>
