import type { SpaceIcon } from '../types/space'

const SPACE_EMOJI: Record<SpaceIcon, string> = {
  couch: '🛋️',
  kitchen: '🍽️',
  bed: '🛏️',
  bath: '🛁',
  desk: '🪑',
  hallway: '🚪',
  study: '📚',
  conservatory: '🪴',
  patio: '🌳',
  balcony: '🌇',
  garden_bed: '🌱',
  greenhouse: '🌿',
}

const SPACE_LABELS: Record<SpaceIcon, string> = {
  couch: 'Living room',
  kitchen: 'Kitchen',
  bed: 'Bedroom',
  bath: 'Bathroom',
  desk: 'Office',
  hallway: 'Hallway',
  study: 'Study',
  conservatory: 'Conservatory',
  patio: 'Patio',
  balcony: 'Balcony',
  garden_bed: 'Garden',
  greenhouse: 'Greenhouse',
}

export const SPACE_ICON_OPTIONS = (Object.keys(SPACE_EMOJI) as SpaceIcon[]).map((slug) => ({
  slug,
  emoji: SPACE_EMOJI[slug],
  label: SPACE_LABELS[slug],
}))

// Space.icon carries '' and null alongside the enum (allow_blank column) —
// falsy input is a real case, not just an unknown slug, so it's handled
// before the lookup rather than left to fall through a plain object index.
export function getSpaceEmoji(slug?: SpaceIcon | '' | null): string | undefined {
  if (!slug) return undefined
  return SPACE_EMOJI[slug]
}

export function formatSpaceName(name: string): string {
  if (!name) return name
  return name.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
}
