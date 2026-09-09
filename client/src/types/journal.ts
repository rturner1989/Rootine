import { z } from 'zod'
import { personalitySchema } from './species'

// JournalStream::KINDS
export const journalKindSchema = z.enum(['water', 'feed', 'photo', 'achievement', 'acquisition'])
export type JournalKind = z.infer<typeof journalKindSchema>

// JournalStream#plant_payload — a slim plant projection shared by every
// entry kind. species is null when the plant has none linked.
const journalPlantSchema = z.object({
  id: z.number(),
  nickname: z.string(),
  species: z
    .object({
      id: z.number(),
      common_name: z.string(),
      personality: personalitySchema,
    })
    .nullable(),
})

const careJournalEntryBaseSchema = z.object({
  id: z.string(),
  occurred_at: z.string(),
  plant: journalPlantSchema.nullable(),
  notes: z.string().nullable(),
})

// Entry shape varies by kind (notes for care, caption/image_url for photo,
// label/emoji for achievement) — a discriminated union matches the real
// per-kind builders in journal_stream.rb instead of one loosely-typed shape.
export const journalEntrySchema = z.discriminatedUnion('kind', [
  careJournalEntryBaseSchema.extend({ kind: z.literal('water') }),
  careJournalEntryBaseSchema.extend({ kind: z.literal('feed') }),
  z.object({
    kind: z.literal('photo'),
    id: z.string(),
    occurred_at: z.string(),
    plant: journalPlantSchema.nullable(),
    caption: z.string().nullable(),
    image_url: z.string().nullable(),
  }),
  z.object({
    kind: z.literal('acquisition'),
    id: z.string(),
    occurred_at: z.string(),
    plant: journalPlantSchema.nullable(),
  }),
  z.object({
    kind: z.literal('achievement'),
    id: z.string(),
    occurred_at: z.string(),
    label: z.string(),
    emoji: z.string(),
    plant: journalPlantSchema.nullable(),
  }),
])

export type JournalEntry = z.infer<typeof journalEntrySchema>
