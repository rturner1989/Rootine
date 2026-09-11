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

// PhotoFeed#payload — the aggregate feed's per-item shape (PhotosController
// index, Plants::PlantPhotosController index). Distinct from
// plantPhotoSchema: no created_at, but carries a slim plant projection since
// the all-plants feed isn't scoped to one plant's page.
export const photoFeedItemSchema = z.object({
  id: z.number(),
  image_url: z.string().nullable(),
  caption: z.string().nullable(),
  taken_at: z.string(),
  plant: z.object({
    id: z.number(),
    nickname: z.string(),
  }),
})

export type PhotoFeedItem = z.infer<typeof photoFeedItemSchema>

// PhotoFeed-backed index actions render { photos, next_cursor } — cursor
// pagination keyed on the last item's taken_at.
export const photoFeedResponseSchema = z.object({
  photos: z.array(photoFeedItemSchema),
  next_cursor: z.string().nullable(),
})

export type PhotoFeedResponse = z.infer<typeof photoFeedResponseSchema>
