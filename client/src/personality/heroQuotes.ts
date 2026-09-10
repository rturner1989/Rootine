// Third-person — the app's voice, not the plant's (per the 2026-05-03
// voice removal). Stoic plants don't speak; the line is editorial.
//
// `pickStable` over `pickRandom` because the hero rerenders on every
// tab switch + care log + remount; a churning quote line reads like a
// bug. Seed by plant.id so each plant has a fixed quote.
import type { Personality } from '../types/species'

const PERSONALITY_QUOTES: Record<Personality, string[]> = {
  dramatic: [
    'Big leaves, bigger feelings.',
    'Always one breath from a monologue.',
    'Loves the spotlight. Tolerates the windowsill.',
    'Photosynthesises like it is a final act.',
    'Every leaf, a soliloquy.',
  ],
  prickly: [
    'Tough as nails, twice as quiet.',
    'Asks for nothing. Resents the asking.',
    'Spines first, opinions second.',
    'Survives on neglect and spite.',
    'Will outlast the warranty.',
  ],
  chill: [
    "Quiet enough to forget about. Don't.",
    'Happy in the corner. Happy anywhere.',
    'Asks nothing. Returns the favour.',
    'Patient by nature, low by maintenance.',
    'Easy company in a leafy room.',
  ],
  needy: [
    'Asks little, expects everything.',
    'Watches the watering can like a hawk.',
    'Recovers quickly. Sulks faster.',
    'Wears its mood in its leaves.',
    'Best day of the week is watering day.',
  ],
  stoic: [
    'Stands its ground. Says nothing.',
    'Steady as the ceiling.',
    'Quiet in winter. Quieter in summer.',
    'Outlasts the furniture.',
    'Gives nothing away.',
  ],
}

const GENERIC_QUOTES = [
  'Steady company on a quiet shelf.',
  'A small green presence.',
  'Rooted, unbothered, alive.',
  'Holds its corner well.',
]

function hashSeed(seed: number | string): number {
  if (typeof seed === 'number' && Number.isFinite(seed)) return Math.abs(seed)
  const text = String(seed ?? '')
  let total = 0
  for (let index = 0; index < text.length; index += 1) {
    total = (total + text.charCodeAt(index)) | 0
  }
  return Math.abs(total)
}

function pickStable(pool: string[], seed?: number | string | null): string {
  if (seed == null) return pool[0]
  return pool[hashSeed(seed) % pool.length]
}

export function getPlantHeroQuote(personality?: Personality, seed?: number | string | null): string {
  const pool = (personality ? PERSONALITY_QUOTES[personality] : undefined) ?? GENERIC_QUOTES
  return pickStable(pool, seed)
}
